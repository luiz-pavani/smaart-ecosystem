import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClientComponentClient({ cookies: () => cookieStore });

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get academy_id from user_academies
    const { data: userAcademy, error: academyError } = await supabase
      .from("user_academies")
      .select("academy_id")
      .eq("user_id", user.id)
      .single();

    if (!userAcademy) {
      return NextResponse.json(
        { error: "Academy not found for user" },
        { status: 404 }
      );
    }

    const academy_id = userAcademy.academy_id;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "overview";

    if (type === "overview") {
      // Get academy's federation info
      const { data: academyData, error: academyFetchError } = await supabase
        .from("academias")
        .select("*, federacoes(id, nome, sigla, cnpj)")
        .eq("id", academy_id)
        .single();

      if (academyFetchError) throw academyFetchError;

      // Get athletes in academy
      const { data: athletes, error: athletesError } = await supabase
        .from("atletas")
        .select("id, nome, graduacao, modality")
        .eq("academia_id", academy_id)
        .limit(100);

      if (athletesError && athletesError.code !== "PGRST116")
        throw athletesError;

      // Get federation events
      const { data: events, error: eventsError } = await supabase
        .from("eventos")
        .select("*")
        .eq("federation_id", academyData?.federacao_id)
        .gte("data_evento", new Date().toISOString())
        .order("data_evento", { ascending: true });

      if (eventsError && eventsError.code !== "PGRST116") throw eventsError;

      return NextResponse.json({
        academy: academyData,
        athleteCount: athletes?.length || 0,
        upcomingEvents: events || [],
        totalEvents: events?.length || 0,
      });
    }

    if (type === "events") {
      // Get academy's federation
      const { data: academyData } = await supabase
        .from("academias")
        .select("federacao_id")
        .eq("id", academy_id)
        .single();

      // Get all federation events with athlete registrations
      const { data: events, error: eventsError } = await supabase
        .from("eventos")
        .select("*, event_registrations(id, atleta_id)")
        .eq("federation_id", academyData?.federacao_id)
        .order("data_evento", { ascending: true });

      if (eventsError && eventsError.code !== "PGRST116") throw eventsError;

      // Get academy athletes
      const { data: athletes, error: athletesError } = await supabase
        .from("atletas")
        .select("id")
        .eq("academia_id", academy_id);

      if (athletesError && athletesError.code !== "PGRST116")
        throw athletesError;

      const academyAthleteIds = athletes?.map((a) => a.id) || [];

      // Mark registered events
      const enrichedEvents = events?.map((event) => ({
        ...event,
        academyAthletes: event.event_registrations?.filter((reg) =>
          academyAthleteIds.includes(reg.atleta_id)
        ).length || 0,
        totalRegistered: event.event_registrations?.length || 0,
      })) || [];

      return NextResponse.json({
        events: enrichedEvents,
        academyAthleteCount: academyAthleteIds.length,
      });
    }

    if (type === "athletes") {
      // Get academy athletes for registration
      const { data: athletes, error: athletesError } = await supabase
        .from("atletas")
        .select("id, nome, graduacao, modality, data_nascimento")
        .eq("academia_id", academy_id)
        .order("nome", { ascending: true });

      if (athletesError && athletesError.code !== "PGRST116")
        throw athletesError;

      return NextResponse.json({
        athletes: athletes || [],
        total: athletes?.length || 0,
      });
    }

    if (type === "register-event") {
      const eventId = searchParams.get("event_id");
      const athleteId = searchParams.get("athlete_id");

      if (!eventId || !athleteId) {
        return NextResponse.json(
          { error: "Missing event_id or athlete_id" },
          { status: 400 }
        );
      }

      // Verify athlete belongs to academy
      const { data: athlete } = await supabase
        .from("atletas")
        .select("id")
        .eq("id", athleteId)
        .eq("academia_id", academy_id)
        .single();

      if (!athlete) {
        return NextResponse.json(
          { error: "Athlete not found in this academy" },
          { status: 403 }
        );
      }

      // Check if already registered
      const { data: existing } = await supabase
        .from("event_registrations")
        .select("id")
        .eq("event_id", eventId)
        .eq("atleta_id", athleteId)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: "Athlete already registered for this event" },
          { status: 409 }
        );
      }

      // Register athlete
      const { data: registration, error: registerError } = await supabase
        .from("event_registrations")
        .insert({
          event_id: eventId,
          atleta_id: athleteId,
          academia_id: academy_id,
          registration_date: new Date().toISOString(),
          status: "REGISTERED",
        })
        .select()
        .single();

      if (registerError) throw registerError;

      return NextResponse.json({
        success: true,
        registration,
      });
    }

    return NextResponse.json({
      error: "Unknown federation type",
      supportedTypes: ["overview", "events", "athletes", "register-event"],
    });
  } catch (error) {
    console.error("Federation API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

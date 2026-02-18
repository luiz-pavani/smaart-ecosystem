import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================
// POST /api/academy/attendance/checkin
// Check-in an athlete to a class
// ============================================
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is academy admin or professor
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("academia_id, role")
      .eq("user_id", user.id)
      .in("role", ["academia_admin", "professor"])
      .single();

    if (!userRole) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      athlete_id,
      class_id,
      check_in_method = "MANUAL",
      check_in_notes
    } = body;

    if (!athlete_id || !class_id) {
      return NextResponse.json(
        { error: "Missing required fields: athlete_id, class_id" },
        { status: 400 }
      );
    }

    // Get class details to get modality_id
    const { data: classData } = await supabase
      .from("classes")
      .select("id, academy_id, modality_id")
      .eq("id", class_id)
      .eq("academy_id", userRole.academia_id)
      .single();

    if (!classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Check if today's check-in already exists
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("athlete_id", athlete_id)
      .eq("class_id", class_id)
      .eq("attendance_date", today)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Athlete already checked in for today" },
        { status: 409 }
      );
    }

    // Create attendance record
    const { data: record, error } = await supabase
      .from("attendance_records")
      .insert({
        athlete_id,
        class_id,
        academy_id: userRole.academia_id,
        modality_id: classData.modality_id,
        attendance_date: today,
        check_in_time: new Date().toISOString(),
        check_in_method,
        check_in_notes,
        taught_by: userRole.role === "professor" ? user.id : null,
        status: "PRESENT"
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      record,
      message: "Check-in successful"
    });

  } catch (error: any) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/academy/attendance/today
// Get today's attendance records
// ============================================
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("academia_id")
      .eq("user_id", user.id)
      .in("role", ["academia_admin", "professor"])
      .single();

    if (!userRole) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: records, error } = await supabase
      .from("attendance_records")
      .select(`
        *,
        athlete:atletas(nome, email),
        class:classes(nome),
        instructor:instructors(nome)
      `)
      .eq("academy_id", userRole.academia_id)
      .eq("attendance_date", today)
      .order("check_in_time", { ascending: false });

    if (error) throw error;

    // Calculate statistics
    const totalPresent = records?.filter(r => r.status === "PRESENT").length || 0;
    const totalAbsent = records?.filter(r => r.status === "ABSENT").length || 0;

    return NextResponse.json({
      success: true,
      date: today,
      total_records: records?.length || 0,
      statistics: {
        present: totalPresent,
        absent: totalAbsent,
        excused: records?.filter(r => r.status === "EXCUSED").length || 0
      },
      records
    });

  } catch (error: any) {
    console.error("Get attendance error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

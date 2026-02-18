import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================
// GET /api/academy/dashboard
// ============================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's academy
    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("academia_id")
      .eq("user_id", user.id)
      .eq("role", "academia_admin")
      .single();

    if (roleError || !userRole) {
      return NextResponse.json(
        { error: "No academy access" },
        { status: 403 }
      );
    }

    const academyId = userRole.academia_id;

    // Fetch dashboard data in parallel
    const [
      { data: academy },
      { data: modalities },
      { data: classes },
      { data: activeEnrollments },
      { data: todayAttendance },
      { data: instructors }
    ] = await Promise.all([
      supabase
        .from("academias")
        .select("*")
        .eq("id", academyId)
        .single(),
      supabase
        .from("modalities")
        .select("*")
        .eq("academy_id", academyId)
        .eq("is_active", true),
      supabase
        .from("classes")
        .select("*")
        .eq("academy_id", academyId)
        .eq("is_active", true),
      supabase
        .from("athlete_enrollments")
        .select("*")
        .eq("academy_id", academyId)
        .eq("status", "ACTIVE"),
      supabase
        .from("attendance_records")
        .select("*")
        .eq("academy_id", academyId)
        .eq("attendance_date", new Date().toISOString().split('T')[0]),
      supabase
        .from("instructors")
        .select("*")
        .eq("academy_id", academyId)
        .eq("is_active", true)
    ]);

    // Calculate metrics
    const totalAthletes = activeEnrollments?.length || 0;
    const totalClasses = classes?.length || 0;
    const totalInstructors = instructors?.length || 0;
    const todayAttendanceCount = todayAttendance?.length || 0;
    const totalModalities = modalities?.length || 0;

    // Group athletes by modality
    const athletesByModality = modalities?.map(mod => {
      const count = activeEnrollments?.filter(e => e.modality_id === mod.id).length || 0;
      return {
        modality_id: mod.id,
        modality_name: mod.name,
        athlete_count: count
      };
    }) || [];

    // Top classes by enrollment
    const topClasses = classes
      ?.map(cls => ({
        ...cls,
        enrollment_rate: ((cls.current_enrollment || 0) / cls.capacity) * 100
      }))
      .sort((a, b) => b.current_enrollment - a.current_enrollment)
      .slice(0, 5) || [];

    return NextResponse.json({
      success: true,
      academy: {
        id: academy?.id,
        name: academy?.nome,
        sigla: academy?.sigla
      },
      metrics: {
        total_athletes: totalAthletes,
        total_classes: totalClasses,
        total_instructors: totalInstructors,
        total_modalities: totalModalities,
        today_attendance: todayAttendanceCount,
        today_attendance_rate: totalAthletes > 0 ? ((todayAttendanceCount / totalAthletes) * 100).toFixed(1) : 0
      },
      athletes_by_modality: athletesByModality,
      top_classes: topClasses,
      modalities: modalities?.map(m => ({ id: m.id, name: m.name, type: m.type }))
    });

  } catch (error: any) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/academy/modalities
// ============================================
export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Route to modality creation
  if (pathname.includes("/modalities")) {
    return handleCreateModality(request);
  }

  // Route to class creation
  if (pathname.includes("/classes")) {
    return handleCreateClass(request);
  }

  // Route to instructor creation
  if (pathname.includes("/instructors")) {
    return handleCreateInstructor(request);
  }

  return NextResponse.json(
    { error: "Not found" },
    { status: 404 }
  );
}

async function handleCreateModality(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify academy admin
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("academia_id")
      .eq("user_id", user.id)
      .eq("role", "academia_admin")
      .single();

    if (!userRole) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, name, description, color_code, icon_name, graduation_system, pricing_multiplier } = body;

    if (!type || !name) {
      return NextResponse.json(
        { error: "Missing required fields: type, name" },
        { status: 400 }
      );
    }

    const { data: modality, error } = await supabase
      .from("modalities")
      .insert({
        academy_id: userRole.academia_id,
        type,
        name,
        description,
        color_code: color_code || "#6366f1",
        icon_name,
        graduation_system,
        pricing_multiplier: pricing_multiplier || 1.0,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      modality
    });

  } catch (error: any) {
    console.error("Create modality error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function handleCreateClass(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("academia_id")
      .eq("user_id", user.id)
      .eq("role", "academia_admin")
      .single();

    if (!userRole) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      modality_id,
      name,
      level,
      capacity,
      description,
      location,
      requires_belt_level,
      min_age_years,
      max_age_years,
      schedule // Array of {day_of_week, start_time, end_time}
    } = body;

    if (!modality_id || !name || !capacity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify modality belongs to academy
    const { data: modality } = await supabase
      .from("modalities")
      .select("id")
      .eq("id", modality_id)
      .eq("academy_id", userRole.academia_id)
      .single();

    if (!modality) {
      return NextResponse.json(
        { error: "Modality not found" },
        { status: 404 }
      );
    }

    // Create class
    const { data: newClass, error: classError } = await supabase
      .from("classes")
      .insert({
        academy_id: userRole.academia_id,
        modality_id,
        name,
        level: level || "INTERMEDIARIO",
        capacity,
        description,
        location,
        requires_belt_level,
        min_age_years,
        max_age_years,
        is_active: true
      })
      .select()
      .single();

    if (classError) throw classError;

    // Create schedules if provided
    if (schedule && Array.isArray(schedule) && schedule.length > 0) {
      const schedules = schedule.map(s => ({
        class_id: newClass.id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        location: s.location,
        is_active: true
      }));

      await supabase.from("class_schedules").insert(schedules);
    }

    return NextResponse.json({
      success: true,
      class: newClass,
      message: `Class "${name}" created successfully${schedule?.length ? ` with ${schedule.length} schedules` : ''}`
    });

  } catch (error: any) {
    console.error("Create class error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function handleCreateInstructor(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("academia_id")
      .eq("user_id", user.id)
      .eq("role", "academia_admin")
      .single();

    if (!userRole) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      email,
      nome,
      cpf,
      telephone,
      specializations, // [{modality, belt_certified_level}]
      salary_type,
      salary_value
    } = body;

    if (!email || !nome) {
      return NextResponse.json(
        { error: "Missing required fields: email, nome" },
        { status: 400 }
      );
    }

    // Check if user exists, if not create auth user
    let instructorUserId = user.id;

    if (email !== user.email) {
      // Create auth user for instructor
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: Math.random().toString(36).slice(-12),
        email_confirm: true
      });

      if (authError) throw authError;
      instructorUserId = authUser.user.id;
    }

    // Create instructor profile
    const { data: instructor, error: instError } = await supabase
      .from("instructors")
      .insert({
        academy_id: userRole.academia_id,
        user_id: instructorUserId,
        nome,
        cpf,
        telephone,
        email,
        salary_type: salary_type || "FIXED",
        salary_value: salary_value || 0,
        is_active: true
      })
      .select()
      .single();

    if (instError) throw instError;

    // Add specializations if provided
    if (specializations && Array.isArray(specializations)) {
      const specs = specializations.map(s => ({
        instructor_id: instructor.id,
        modality: s.modality,
        belt_certified_level: s.belt_certified_level,
        is_certified: true
      }));

      await supabase.from("instructor_specializations").insert(specs);
    }

    return NextResponse.json({
      success: true,
      instructor,
      message: `Instructor "${nome}" created successfully`
    });

  } catch (error: any) {
    console.error("Create instructor error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

-- ================================================================
-- MIGRATION 012: ACADEMY MANAGEMENT SYSTEM - FOUNDATION LAYER
-- ================================================================
-- Created: 2026-02-18
-- Purpose: Complete academy management with modalities, classes,
--          instructors, attendance, and belt progression systems
--
-- Tables:
--  1. modalities - Sport types (Judo, BJJ, Gym)
--  2. classes - Class/group definitions
--  3. class_schedules - Recurring schedules for classes
--  4. instructors - Professor/Teacher profiles with certifications
--  5. instructor_specializations - Many-to-many instructor skills
--  6. athlete_enrollments - Athlete participation in classes
--  7. belt_progression - Belt/graduation system per modality
--  8. attendance_records - Daily check-in/check-out tracking
--  9. academy_financial - Monthly financial summaries
--  10. modality_graduation_systems - Define graduation rules per modality

-- Extension for UUID if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- TABLE 1A: INSTRUCTORS (Created first to avoid FK references)
-- ================================================================
CREATE TABLE IF NOT EXISTS instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academias(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal info
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(14),
  rg VARCHAR(20),
  
  -- Professional info
  registration_cref VARCHAR(50), -- CREF number (PT certification)
  registration_caipe VARCHAR(50), -- CAIPE number (BJJ instructor)
  registration_cbj VARCHAR(50), -- CBJ number (Judo instructor)
  
  -- Certifications (JSON)
  certifications JSONB DEFAULT '[]', -- [{"type": "JUDO", "level": "PRETA_3", "date": "2020-01-15"}]
  
  -- Contact
  telephone VARCHAR(20),
  email VARCHAR(255),
  
  -- Employment info
  date_hired DATE,
  salary_type VARCHAR(20), -- FIXED, PER_CLASS, PERCENTAGE, COMMISSION
  salary_value DECIMAL(10,2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  hire_date DATE,
  termination_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instructors_academy ON instructors(academy_id);
CREATE INDEX IF NOT EXISTS idx_instructors_user ON instructors(user_id);
CREATE INDEX IF NOT EXISTS idx_instructors_active ON instructors(academy_id, is_active);

ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View instructors" ON instructors;
CREATE POLICY "View instructors" ON instructors
  FOR SELECT USING (
    academy_id IN (
      SELECT academia_id FROM user_roles
      WHERE user_id = auth.uid()
    ) OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Manage instructor own profile" ON instructors;
CREATE POLICY "Manage instructor own profile" ON instructors
  FOR UPDATE USING (user_id = auth.uid());

-- ================================================================
-- TABLE 1: MODALITIES (Sport Types)
-- ================================================================
CREATE TABLE IF NOT EXISTS modalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academias(id) ON DELETE CASCADE,
  
  -- Modality info
  type VARCHAR(20) NOT NULL, -- JUDO, BJJ, GYM, BOXE, MUAY_THAI, etc
  name VARCHAR(100) NOT NULL, -- "Judô", "Jiu-Jitsu Brasileiro", "Academia de Musculação"
  description TEXT,
  
  -- Color branding
  color_code VARCHAR(7) DEFAULT '#6366f1', -- Hex color for UI
  icon_name VARCHAR(50), -- lucide icon name: Zap, Dumbbell, Users, etc
  
  -- Pricing configuration
  pricing_multiplier DECIMAL(3,2) DEFAULT 1.0, -- 1.0 = base price, 1.2 = +20%
  
  -- Graduation system reference
  graduation_system VARCHAR(50), -- JUDO_KIHON, BJJ_IBJJF, GYM_LEVELS, etc
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modalities_academy ON modalities(academy_id);
CREATE INDEX IF NOT EXISTS idx_modalities_type ON modalities(type);

-- RLS for modalities
ALTER TABLE modalities ENABLE ROW LEVEL SECURITY;

-- Academies can view their modalities
DROP POLICY IF EXISTS "Academia can view own modalities" ON modalities;
CREATE POLICY "Academia can view own modalities" ON modalities
  FOR SELECT USING (
    academy_id IN (
      SELECT academia_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('academia_admin', 'professor', 'atleta')
    )
  );

-- Academy admins can manage modalities
DROP POLICY IF EXISTS "Academia admin manages modalities" ON modalities;
CREATE POLICY "Academia admin manages modalities" ON modalities
  FOR ALL USING (
    academy_id IN (
      SELECT academia_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'academia_admin'
    )
  );

-- ================================================================
-- TABLE 2: CLASSES (Groups/Groups)
-- ================================================================
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academias(id) ON DELETE CASCADE,
  modality_id UUID NOT NULL REFERENCES modalities(id) ON DELETE CASCADE,
  
  -- Class info
  name VARCHAR(100) NOT NULL, -- "Judô Infantil", "BJJ Iniciante", "Musculação Funcional"
  description TEXT,
  level VARCHAR(30) DEFAULT 'INTERMEDIARIO', -- INICIANTE, INTERMEDIARIO, AVANCADO, COMPETICAO, LAZER
  
  -- Capacity
  capacity INTEGER NOT NULL DEFAULT 20,
  current_enrollment INTEGER DEFAULT 0,
  
  -- Location
  location VARCHAR(100), -- "Sala 1", "Tatame A", "Studio"
  
  -- Instructor assignment
  primary_instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
  
  -- Configuration
  requires_belt_level VARCHAR(50), -- NULL = open to all, "BRANCA" = white belt only, etc
  min_age_years INTEGER, -- Minimum age requirement
  max_age_years INTEGER, -- Maximum age requirement (for youth classes)
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_open_for_enrollment BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_academy ON classes(academy_id);
CREATE INDEX IF NOT EXISTS idx_classes_modality ON classes(modality_id);
CREATE INDEX IF NOT EXISTS idx_classes_active ON classes(academy_id, is_active);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Academia can view own classes" ON classes;
CREATE POLICY "Academia can view own classes" ON classes
  FOR SELECT USING (
    academy_id IN (
      SELECT academia_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Academia admin manages classes" ON classes;
CREATE POLICY "Academia admin manages classes" ON classes
  FOR ALL USING (
    academy_id IN (
      SELECT academia_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'academia_admin'
    )
  );

-- ================================================================
-- TABLE 3: CLASS SCHEDULES (Recurring)
-- ================================================================
CREATE TABLE IF NOT EXISTS class_schedules (
-- ================================================================
CREATE TABLE IF NOT EXISTS instructor_specializations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  
  -- Specialization
  modality VARCHAR(20) NOT NULL, -- JUDO, BJJ, GYM, etc
  belt_certified_level VARCHAR(30), -- BRANCA, AZUL, ROXA, MARROM, PRETA, etc
  experience_years INTEGER,
  is_certified BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instructor_specs_instructor ON instructor_specializations(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_specs_modality ON instructor_specializations(modality);

-- ================================================================
-- TABLE 6: ATHLETE ENROLLMENTS (Class Registration)
-- ================================================================
CREATE TABLE IF NOT EXISTS athlete_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  modality_id UUID NOT NULL REFERENCES modalities(id) ON DELETE CASCADE,
  
  -- Belt info
  current_belt VARCHAR(30), -- BRANCA, AZUL, ROXA, MARROM, PRETA, etc
  belt_stripe INTEGER DEFAULT 0, -- 0-4 stripes typically
  belt_promoted_date DATE,
  
  -- Enrollment status
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  trial_start_date DATE,
  trial_end_date DATE,
  dropout_date DATE,
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, DROPPED, TRIAL, ON_HOLD
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrollments_athlete ON athlete_enrollments(athlete_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON athlete_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON athlete_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_athlete_status ON athlete_enrollments(athlete_id, status);

ALTER TABLE athlete_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Athletes see own enrollments" ON athlete_enrollments;
CREATE POLICY "Athletes see own enrollments" ON athlete_enrollments
  FOR SELECT USING (athlete_id = auth.uid());

DROP POLICY IF EXISTS "Academia admins see enrollments" ON athlete_enrollments;
CREATE POLICY "Academia admins see enrollments" ON athlete_enrollments
  FOR SELECT USING (
    class_id IN (
      SELECT id FROM classes
      WHERE academy_id IN (
        SELECT academia_id FROM user_roles
        WHERE user_id = auth.uid()
        AND (role = 'academia_admin' OR role = 'professor')
      )
    )
  );

-- ================================================================
-- TABLE 7: BELT PROGRESSION SYSTEM
-- ================================================================
CREATE TABLE IF NOT EXISTS belt_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
  modality_id UUID NOT NULL REFERENCES modalities(id) ON DELETE CASCADE,
  
  -- Current status
  current_belt VARCHAR(30) NOT NULL, -- BRANCA, AZUL, ROXA, MARROM, PRETA, etc
  current_stripe INTEGER DEFAULT 0, -- 0-4 for most systems
  
  -- Promotion requirements
  belt_start_date DATE NOT NULL,
  min_training_days_required INTEGER,
  training_days_completed INTEGER DEFAULT 0,
  months_in_current_belt DECIMAL(5,2),
  
  -- Promotion request
  promotion_requested_date DATE,
  promotion_requested_by UUID REFERENCES instructors(id),
  promotion_pending BOOLEAN DEFAULT false,
  
  -- Promotion approval
  approved_by UUID REFERENCES instructors(id),
  promoted_date DATE,
  promotion_notes TEXT,
  
  -- History (JSON array of all progressions)
  progression_history JSONB DEFAULT '[]', -- [{belt: "BRANCA", promoted_date: "2023-01-15", promoted_by: "..."}]
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_belt_progression_athlete ON belt_progression(athlete_id);
CREATE INDEX IF NOT EXISTS idx_belt_progression_modality ON belt_progression(modality_id);
CREATE INDEX IF NOT EXISTS idx_belt_progression_pending ON belt_progression(promotion_pending);

ALTER TABLE belt_progression ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Athletes see own belt progression" ON belt_progression;
CREATE POLICY "Athletes see own belt progression" ON belt_progression
  FOR SELECT USING (athlete_id = auth.uid());

-- ================================================================
-- TABLE 8: ATTENDANCE RECORDS (Check-in/Check-out)
-- ================================================================
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  academy_id UUID NOT NULL REFERENCES academias(id) ON DELETE CASCADE,
  modality_id UUID NOT NULL REFERENCES modalities(id) ON DELETE CASCADE,
  
  -- Attendance details
  attendance_date DATE NOT NULL,
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  duration_minutes INTEGER,
  
  -- Check-in method
  check_in_method VARCHAR(30) DEFAULT 'MANUAL', -- QR_CODE, BIOMETRIC, MANUAL, API, APP
  check_in_notes TEXT,
  
  -- Class info
  taught_by UUID REFERENCES instructors(id),
  
  -- Status
  status VARCHAR(20) DEFAULT 'PRESENT', -- PRESENT, ABSENT, EXCUSED, LATE, EARLY_CHECKOUT
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_athlete ON attendance_records(athlete_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance_records(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_athlete_date ON attendance_records(athlete_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_academy_date ON attendance_records(academy_id, attendance_date);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Athletes see own attendance" ON attendance_records;
CREATE POLICY "Athletes see own attendance" ON attendance_records
  FOR SELECT USING (athlete_id = auth.uid());

DROP POLICY IF EXISTS "Academia admins see attendance" ON attendance_records;
CREATE POLICY "Academia admins see attendance" ON attendance_records
  FOR SELECT USING (
    academy_id IN (
      SELECT academia_id FROM user_roles
      WHERE user_id = auth.uid()
      AND (role = 'academia_admin' OR role = 'professor')
    )
  );

-- ================================================================
-- TABLE 9: ACADEMY FINANCIAL (Monthly Tracking)
-- ================================================================
CREATE TABLE IF NOT EXISTS academy_financial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academias(id) ON DELETE CASCADE,
  modality_id UUID REFERENCES modalities(id) ON DELETE SET NULL,
  
  -- Period
  financial_month INTEGER NOT NULL, -- 1-12
  financial_year INTEGER NOT NULL,
  
  -- Revenue breakdown
  total_revenue DECIMAL(10,2) DEFAULT 0, -- All incoming payments
  memberships_revenue DECIMAL(10,2) DEFAULT 0, -- From subscriptions
  events_revenue DECIMAL(10,2) DEFAULT 0, -- From class events/workshops
  other_revenue DECIMAL(10,2) DEFAULT 0,
  
  -- Costs
  instructor_costs DECIMAL(10,2) DEFAULT 0,
  operational_costs DECIMAL(10,2) DEFAULT 0, -- Rent, utilities, etc
  material_costs DECIMAL(10,2) DEFAULT 0,
  marketing_costs DECIMAL(10,2) DEFAULT 0,
  total_costs DECIMAL(10,2) DEFAULT 0,
  
  -- Metrics
  athlete_count INTEGER DEFAULT 0,
  active_classes INTEGER DEFAULT 0,
  average_attendance_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Calculated
  net_profit DECIMAL(10,2) DEFAULT 0,
  profit_margin DECIMAL(5,2) DEFAULT 0,
  
  -- Status
  is_finalized BOOLEAN DEFAULT false,
  final_by UUID REFERENCES auth.users(id),
  finalized_at TIMESTAMP,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academy_financial_academy ON academy_financial(academy_id);
CREATE INDEX IF NOT EXISTS idx_academy_financial_period ON academy_financial(academy_id, financial_year, financial_month);

ALTER TABLE academy_financial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Academy admins see financial data" ON academy_financial;
CREATE POLICY "Academy admins see financial data" ON academy_financial
  FOR SELECT USING (
    academy_id IN (
      SELECT academia_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'academia_admin'
    )
  );

-- ================================================================
-- TABLE 10: MODALITY GRADUATION SYSTEMS
-- ================================================================
CREATE TABLE IF NOT EXISTS modality_graduation_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID REFERENCES academias(id) ON DELETE CASCADE,
  
  -- System definition
  modality VARCHAR(30) NOT NULL, -- JUDO, BJJ, GYM, etc
  system_name VARCHAR(100), -- "IBJJF", "CBJ", "Gym Levels"
  
  -- Belt progression (ordered)
  belts JSONB NOT NULL DEFAULT '[]', -- [{"order": 1, "name": "BRANCA", "color": "#FFFFFF"}, ...]
  
  -- Requirements between belts
  min_months_per_belt INTEGER DEFAULT 6,
  min_training_days_per_belt INTEGER DEFAULT 100,
  
  -- Promotion criteria
  promotion_requires_exam BOOLEAN DEFAULT false,
  promotion_exam_fee DECIMAL(10,2),
  
  -- Configuration
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graduation_systems_academy ON modality_graduation_systems(academy_id);
CREATE INDEX IF NOT EXISTS idx_graduation_systems_modality ON modality_graduation_systems(modality);

-- ================================================================
-- AUTO-UPDATE TIMESTAMPS
-- ================================================================

CREATE OR REPLACE FUNCTION update_updated_at_academy_tables()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER modalities_updated_at BEFORE UPDATE ON modalities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_academy_tables();

CREATE TRIGGER classes_updated_at BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_academy_tables();

CREATE TRIGGER instructors_updated_at BEFORE UPDATE ON instructors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_academy_tables();

CREATE TRIGGER athlete_enrollments_updated_at BEFORE UPDATE ON athlete_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_academy_tables();

CREATE TRIGGER belt_progression_updated_at BEFORE UPDATE ON belt_progression
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_academy_tables();

CREATE TRIGGER academy_financial_updated_at BEFORE UPDATE ON academy_financial
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_academy_tables();

-- ================================================================
-- SEED DATA (Optional for development/demonstration)
-- ================================================================

-- Uncomment to seed demonstration data:
/*
-- Example modality for a test academy
-- INSERT INTO modalities (academy_id, type, name, description, color_code, icon_name, graduation_system)
-- VALUES (
--   'SELECT id FROM academias LIMIT 1',
--   'JUDO',
--   'Judô Infantil',
--   'Classes de judô para crianças',
--   '#FF6B6B',
--   'Users',
--   'JUDO_KIHON'
-- );
*/

-- ================================================================
-- COMMENTS
-- ================================================================

COMMENT ON TABLE modalities IS 'Define sport modalities offered by academy (Judo, BJJ, Gym, etc)';
COMMENT ON TABLE classes IS 'Class/group definitions with level, capacity, and schedule';
COMMENT ON TABLE class_schedules IS 'Recurring weekly schedules for each class';
COMMENT ON TABLE instructors IS 'Professor/instructor profiles with certifications';
COMMENT ON TABLE athlete_enrollments IS 'Track athlete participation in classes';
COMMENT ON TABLE belt_progression IS 'Manage belt/graduation progression per modality';
COMMENT ON TABLE attendance_records IS 'Daily check-in/check-out tracking for classes';
COMMENT ON TABLE academy_financial IS 'Monthly financial summaries and metrics';
COMMENT ON TABLE modality_graduation_systems IS 'Define graduation rules and belt progression per modality';

-- ================================================================
-- MIGRATION COMPLETED
-- ================================================================
-- Next steps:
-- 1. Run API endpoints to create/manage modalities, classes, instructors
-- 2. Create React pages for academy dashboard, class management
-- 3. Build attendance check-in interface
-- 4. Implement belt promotion system
-- 5. Create financial reporting dashboard

# 🏢 TITAN Academy Management System - Strategic Architecture

> **Core Principle:** One unified platform where Academy Owners, Instructors, and Athletes can manage Judo, BJJ, and Gym operations seamlessly while integrating with Federation and Event systems.

---

## 📊 Current State Analysis

### ✅ What We Have
- ✓ Multi-tenant federation architecture
- ✓ Academy registration & management
- ✓ Athlete registration with CSV import
- ✓ User roles & RBAC (14+ roles)
- ✓ Payment integration (Safe2Pay)
- ✓ Dynamic subscription plans
- ✓ Attendance tracking foundation (frequencia table)
- ✓ Federation & Event integration points

### ❌ What's Missing
- ✗ Modality/Sport-specific management (Judo, BJJ, Gym differentiation)
- ✗ Class/Schedule management system
- ✗ Instructor/Professor management with certifications
- ✗ Real-time attendance check-in/QR code system
- ✗ Academy-specific dashboard with key metrics
- ✗ Graduation/Belt progression tracking (per modality)
- ✗ Financial reporting & revenue analytics
- ✗ Communication system (announcements, notifications)
- ✗ Multi-modality subscription pricing
- ✗ Academy performance analytics

---

## 🏗️ Architecture Layers

### Layer 1: Database Schema (Migrations)

#### 1.1 Modalities Management
```sql
-- Define Judo, BJJ, Gym as first-class entities
TABLE: modalities
  - id, academy_id, type (JUDO | BJJ | GYM)
  - name, description, color_code
  - graduation_system (JUDO_KIHON, BJJ_IBJJF, GYM_LEVELS)
  - pricing_multiplier (1.0 = base price, 1.2 = 20% markup)
  - is_active, created_at
```

#### 1.2 Classes & Schedules
```sql
TABLE: classes
  - id, academy_id, modality_id (FK)
  - name, level (INICIANTE, INTERMEDIARIO, AVANCADO)
  - capacity, current_enrollment
  - schedule (recurring or specific dates)
  - instructors (many-to-many)
  - is_active, created_at

TABLE: class_schedules
  - id, class_id
  - day_of_week, start_time, end_time
  - location (sala/tatame)
  - max_capacity
```

#### 1.3 Instructors/Professors
```sql
TABLE: instructors
  - id, academy_id, user_id (FK to auth.users)
  - nome, cpf, registration_cref_caipe
  - specializations (JSONB: ["JUDO", "BJJ", "GYM"])
  - graduated_belt_in (JSONB: {JUDO: "PRETA_3", BJJ: "PRETA_2"})
  - phone, email
  - date_hired, salary_type (FIXED, PER_CLASS, PERCENTAGE)
  - salary_value
  - is_active, created_at
```

#### 1.4 Athlete-Class Enrollment
```sql
TABLE: athlete_enrollments
  - id, athlete_id, class_id
  - modality_id (denormalized for quick access)
  - current_belt (JUDO: BRANCA, BJJ: BRANCA, etc)
  - belt_promotion_date
  - enrollment_date, dropout_date (if applicable)
  - status (ACTIVE, PAUSED, DROPPED)
```

#### 1.5 Attendance Tracking (Enhanced)
```sql
TABLE: attendance_records
  - id, athlete_id, class_id, academy_id
  - date, check_in_time, check_out_time
  - check_in_method (QR, BIOMETRIC, MANUAL, APP)
  - taught_by (instructor_id)
  - notes
  - created_at

-- Generate daily/weekly/monthly reports from this
```

#### 1.6 Belt Progression System (Per Modality)
```sql
TABLE: belt_progression
  - id, athlete_id, modality_id
  - current_belt, current_stripe
  - promotion_date
  - requirements_met (JSONB: class_count, time_in_belt, etc)
  - promoted_by (instructor_id)
  - created_at
```

#### 1.7 Financial Management
```sql
TABLE: academy_financial
  - id, academy_id
  - month, year
  - total_revenue (from all modalities)
  - instructor_costs
  - operational_costs (rent, utilities, etc)
  - net_profit
  - athlete_count_by_modality (JSONB)
```

### Layer 2: API Endpoints

#### 2.1 Academy Management
```
GET    /api/academy/dashboard                    # Overview stats
GET    /api/academy/settings                     # Academy info
PUT    /api/academy/settings                     # Update academy
GET    /api/academy/modalities                   # List modalities
POST   /api/academy/modalities                   # Create modality
```

#### 2.2 Classes Management
```
GET    /api/academy/classes                      # List all classes
POST   /api/academy/classes                      # Create class
GET    /api/academy/classes/:id                  # Get class details
PUT    /api/academy/classes/:id                  # Update class
DELETE /api/academy/classes/:id                  # Delete class
GET    /api/academy/classes/:id/enrollments      # List enrollees
```

#### 2.3 Instructors Management
```
GET    /api/academy/instructors                  # List instructors
POST   /api/academy/instructors                  # Add instructor
GET    /api/academy/instructors/:id              # Get details
PUT    /api/academy/instructors/:id              # Update
DELETE /api/academy/instructors/:id              # Remove
POST   /api/academy/instructors/:id/assignments  # Assign to classes
```

#### 2.4 Attendance
```
POST   /api/academy/attendance/checkin           # Check-in athlete
POST   /api/academy/attendance/checkout          # Check-out athlete
GET    /api/academy/attendance/today             # Today's attendance
GET    /api/academy/attendance/class/:id         # By class
GET    /api/academy/attendance/athlete/:id       # By athlete
GET    /api/academy/attendance/report            # Generate report
```

#### 2.5 Belt Management
```
GET    /api/academy/belts/athlete/:id            # Current belt status
PUT    /api/academy/belts/promote                # Promote athlete
GET    /api/academy/belts/history/:athleteId     # Promotion history
GET    /api/academy/belts/pending-promotions     # Review queue
```

#### 2.6 Financial
```
GET    /api/academy/financial/dashboard          # Overview
GET    /api/academy/financial/monthly/:year/:month
GET    /api/academy/financial/revenue-by-modality
GET    /api/academy/financial/instructor-costs
GET    /api/academy/financial/athlete-lifetime-value
```

### Layer 3: Frontend Pages & Components

#### 3.1 Academy Owner Dashboard
```
app/(dashboard)/academy/dashboard/page.tsx
├─ Quick Stats Card (Athletes, Classes, Revenue)
├─ Today's Classes Widget
├─ Attendance Summary
├─ Revenue Trend Chart
├─ Top Performing Classes
└─ Upcoming Actions Needed
```

#### 3.2 Class Management
```
app/(dashboard)/academy/classes/page.tsx
├─ List view / Calendar view
├─ Create class modal
├─ Edit/Delete actions
└─ Enrollment management

app/(dashboard)/academy/classes/[id]/page.tsx
├─ Class details
├─ Schedule management
├─ Instructor assignments
├─ Current enrollees
└─ Attendance history
```

#### 3.3 Attendance System
```
app/(dashboard)/academy/attendance/page.tsx
├─ QR code scanner
├─ Quick check-in interface
├─ Today's attendance list
├─ Attendance reports

app/(dashboard)/academy/attendance/reports/page.tsx
├─ Daily/Weekly/Monthly reports
├─ By class/athlete filters
├─ Export to CSV
```

#### 3.4 Instructor Management
```
app/(dashboard)/academy/instructors/page.tsx
├─ List of instructors
├─ Add new instructor form
├─ Edit instructor details
├─ Class assignments
├─ Performance metrics

app/(dashboard)/academy/instructors/[id]/page.tsx
├─ Instructor profile
├─ Classes taught
├─ Students rating
├─ Schedule
```

#### 3.5 Belt System Management
```
app/(dashboard)/academy/belts/page.tsx
├─ Current belt distribution (by modality)
├─ Pending promotions
├─ Promotion history

app/(dashboard)/academy/belts/promote/[athleteId]/page.tsx
├─ Promotion form
├─ Requirements checklist
├─ Before/After photos
├─ Certificate generation
```

#### 3.6 Financial Dashboard
```
app/(dashboard)/academy/financial/dashboard/page.tsx
├─ Revenue overview
├─ Costs breakdown
├─ Profit margin
├─ Revenue by modality

app/(dashboard)/academy/financial/reports/page.tsx
├─ Monthly statements
├─ Instructor payments
├─ Athlete payment status
├─ Export to accounting software
```

#### 3.7 Athlete Side
```
app/(dashboard)/athlete/my-classes/page.tsx
├─ Enrolled classes
├─ Attendance record
├─ Next class
├─ My belt status

app/(dashboard)/athlete/profile/page.tsx
├─ Personal info
├─ Current belt (per modality)
├─ Attendance stats
├─ Payments
├─ Download digital ID card
```

### Layer 4: FederationIntegration

#### Integration Points
```
1. Athletes can view their federation license status in academy dashboard
2. Academy can sync federation events to class calendar
3. Athletes can register for federation events from academy app
4. Federation sees academy's modality/class structure
5. Graduation certifications linked to federation records
6. Cross-academy athlete transfers tracked
```

### Layer 5: Event System Integration

#### Integration Points
```
1. Athletes see federation/confederation events in "Events" section
2. Quick registration for events (pre-filled data from academy)
3. Event participation tracked in athlete records
4. Medals/Rankings displayed in athlete profile
5. Event category suggestions based on belt/weight
```

---

## 🎯 Implementation Phases

### Phase 1: Core Academy Infrastructure (Week 1)
- [ ] Database migrations (modalities, classes, instructors, enrollments)
- [ ] Academy dashboard with basic stats
- [ ] Class management CRUD
- [ ] Instructor management

### Phase 2: Attendance & Modalities (Week 2)
- [ ] Enhanced attendance check-in system
- [ ] QR code integration
- [ ] Modality-specific graduation systems
- [ ] Belt progression tracking

### Phase 3: Financial & Reporting (Week 3)
- [ ] Financial dashboard
- [ ] Revenue analytics by modality
- [ ] Instructor payment management
- [ ] Export/reporting features

### Phase 4: Integration & Polish (Week 4)
- [ ] Federation integration
- [ ] Event system integration
- [ ] Communication system (notifications, announcements)
- [ ] Mobile optimizations
- [ ] Full testing & deployment

---

## 🔐 Security & RLS Strategy

### Role-Based Access

```typescript
// Academy Owner
- Can manage all academy data
- Can create/edit classes and instructors
- Can view all financial reports
- Can view all athlete data

// Instructor/Professor
- Can view/edit their assigned classes
- Can check-in attendance for their classes
- Can suggest belt promotions
- Can view their schedule

// Athlete/Member
- Can view own profile
- Can see my classes and schedule
- Can view my attendance
- Can view my belt progression
- Can register for events
- Can download digital ID

// Federation Admin
- Can see academy structure
- Can view aggregate stats
- Can manage federation events
```

### RLS Policies
```sql
-- Classes: Owned by academy, visible to all academy users
-- Attendance: Private (athlete sees own), admins see all
-- Financial: Only academy admin + federation
-- Instructors: Academy admin + self
```

---

## 📈 Key Success Metrics

### For Academy Owners
- Ability to manage 50+ athletes efficiently
- Real-time attendance insights
- Clear financial visibility
- Class utilization rates
- Student retention tracking

### For Athletes
- Easy class enrollment
- Clear attendance history
- Belt progression transparency
- Simple check-in process
- Event registration integration

### For Federation
- Unified view of affiliated academies
- Standardized data collection
- Integration with federation events
- Graduation/belt alignment

---

## 🔌 Technical Stack

- **Database:** PostgreSQL + Supabase with RLS
- **Backend:** Next.js API routes
- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Real-time:** Supabase Realtime (attendance updates)
- **QR Codes:** qrcode.react + jsQR
- **Charts:** recharts for analytics
- **Storage:** Supabase Storage for certificates/IDs
- **Export:** papaparse for CSV, html2pdf for reports

---

## 🚀 Deployment Strategy

1. **Database**: Deploy migrations in sequence
2. **API**: Deploy new endpoints gradually
3. **Frontend**: Feature flags for new pages
4. **Testing**: E2E tests for each phase
5. **Feedback**: Beta test with 2-3 academies first

---

## 📋 Next Steps

1. **Start Phase 1** to establish core infrastructure
2. **Get feedback from academy owners** on MVP
3. **Iterate on UX** based on testing
4. **Scale to full federation** once stable
5. **Document API** for potential third-party integrations


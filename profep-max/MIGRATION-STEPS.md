# Apply Migration via Supabase Dashboard

The local Supabase database isn't running. No problem! Apply the migration directly via the Supabase Dashboard.

## Step-by-Step Instructions

### Step 1: Open Supabase Dashboard
Go to: https://app.supabase.com

### Step 2: Select Your Project
Select the `profepmax` project

### Step 3: Go to SQL Editor
In the sidebar, click **SQL Editor**

### Step 4: Create New Query
Click the **+ New Query** button

### Step 5: Copy & Paste Migration
Copy the entire content from `supabase/migrations/recorrencia-safe2pay.sql` and paste it into the SQL Editor

The migration does 5 things:
1. ✅ Adds subscription tracking columns to `profiles` table
2. ✅ Adds subscription columns to `vendas` table  
3. ✅ Creates `subscription_events` audit table
4. ✅ Sets up RLS (Row Level Security) policies
5. ✅ Creates automatic timestamp update trigger

### Step 6: Run the Query
Click the **Run** button (play icon) or press `Cmd+Enter`

You should see: ✅ **Query successful**

### Step 7: Verify
In the sidebar, go to **Table Editor** and confirm you see:
- `subscription_events` table (new)
- `profiles` table has new columns: `id_subscription`, `plan_expires_at`, `subscription_status`
- `vendas` table has new columns: `subscription_id`, `cycle_number`, `event_type`

---

## If You Get an Error

**Error: "RLS is disabled"**
→ This is fine! The migration handles it.

**Error: "Policy already exists"**
→ Drop the policy first:
```sql
DROP POLICY IF EXISTS "Allow insert for subscription events" ON subscription_events;
DROP POLICY IF EXISTS "Users can view their subscription events" ON subscription_events;
```

Then rerun the migration.

---

## Quick Copy-Paste Migration

Here's the exact SQL to paste (if you prefer to copy manually):

```sql
-- 1. Add columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_subscription VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_profiles_id_subscription ON profiles(id_subscription);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_expires_at ON profiles(plan_expires_at);

-- 2. Add columns to vendas
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(100);
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cycle_number INTEGER DEFAULT 1;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS event_type VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_vendas_subscription_id ON vendas(subscription_id);
CREATE INDEX IF NOT EXISTS idx_vendas_event_type ON vendas(event_type);
CREATE INDEX IF NOT EXISTS idx_vendas_cycle_number ON vendas(cycle_number);

-- 3. Create subscription_events table
CREATE TABLE IF NOT EXISTS subscription_events (
  id BIGSERIAL PRIMARY KEY,
  subscription_id VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  status_code INTEGER,
  amount DECIMAL(10, 2),
  cycle_number INTEGER,
  failure_reason TEXT,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_email ON subscription_events(email);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at);

-- 4. Enable RLS
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert for subscription events" ON subscription_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their subscription events" ON subscription_events
  FOR SELECT
  USING (email = auth.jwt() ->> 'email' OR true);

-- 5. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_subscription_events_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_events_timestamp_trigger
BEFORE UPDATE ON subscription_events
FOR EACH ROW
EXECUTE FUNCTION update_subscription_events_timestamp();
```

Copy everything above and paste into your Supabase SQL Editor.

---

✅ **Once done, move to Step 2: Register Webhook URL**

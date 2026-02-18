-- Migration: Add Dynamic Plan Management for Federations and Academies
-- Stores custom subscription plans with Safe2Pay integration
-- Supports both federation-wide and academy-specific plan creation

CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    federation_id UUID NOT NULL REFERENCES federacoes(id) ON DELETE CASCADE,
    academy_id UUID REFERENCES academias(id) ON DELETE CASCADE,
    
    -- Plan Scope: Determines who created and owns this plan
    -- 'federation' = Federation-wide plans (visible to all academies in federation)
    -- 'academy' = Academy-specific plans (only for this academy)
    plan_scope VARCHAR(50) NOT NULL DEFAULT 'federation',
    
    -- Safe2Pay Integration
    safe2pay_plan_id INTEGER NOT NULL UNIQUE,
    
    -- Plan Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    
    -- Frequency: 1=Monthly, 2=Weekly, 3=Biweekly, 4=Quarterly
    frequency INTEGER NOT NULL DEFAULT 1,
    
    -- Features & Restrictions
    max_athletes INTEGER,
    max_academies INTEGER,
    features JSONB DEFAULT '{}'::jsonb,
    
    -- Discounts
    discount_type VARCHAR(50), -- 'percentage' | 'fixed' | 'early_bird'
    discount_value DECIMAL(10, 2),
    discount_valid_until TIMESTAMP,
    
    -- Billing Settings
    auto_renew BOOLEAN DEFAULT true,
    trial_days INTEGER DEFAULT 0,
    billing_cycle_days INTEGER,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    
    CONSTRAINT valid_frequency CHECK (frequency IN (1, 2, 3, 4)),
    CONSTRAINT positive_price CHECK (price > 0),
    CONSTRAINT valid_plan_scope CHECK (plan_scope IN ('federation', 'academy')),
    CONSTRAINT academy_required_for_academy_scope CHECK (
        (plan_scope = 'federation' AND academy_id IS NULL) OR 
        (plan_scope = 'academy' AND academy_id IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX idx_plans_federation_id ON plans(federation_id);
CREATE INDEX idx_plans_academy_id ON plans(academy_id);
CREATE INDEX idx_plans_is_active ON plans(is_active);
CREATE INDEX idx_plans_safe2pay_id ON plans(safe2pay_plan_id);
CREATE INDEX idx_plans_plan_scope ON plans(plan_scope);

-- Table to track plan subscriptions
CREATE TABLE IF NOT EXISTS plan_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    federation_id UUID NOT NULL REFERENCES federacoes(id) ON DELETE CASCADE,
    academy_id UUID REFERENCES academias(id) ON DELETE SET NULL,
    
    -- Subscription Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- pending | active | paused | cancelled | expired
    
    -- Safe2Pay Subscription
    safe2pay_subscription_id INTEGER,
    
    -- Usage Tracking
    athletes_added INTEGER DEFAULT 0,
    academies_added INTEGER DEFAULT 0,
    
    -- Billing
    start_date TIMESTAMP DEFAULT now(),
    end_date TIMESTAMP,
    renewal_date TIMESTAMP,
    
    -- Discount Applied
    discount_applied DECIMAL(10, 2) DEFAULT 0,
    
    -- Notes
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'paused', 'cancelled', 'expired'))
);

-- Indexes for subscriptions
CREATE INDEX idx_subscriptions_user_id ON plan_subscriptions(user_id);
CREATE INDEX idx_subscriptions_federation_id ON plan_subscriptions(federation_id);
CREATE INDEX idx_subscriptions_academy_id ON plan_subscriptions(academy_id);
CREATE INDEX idx_subscriptions_plan_id ON plan_subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON plan_subscriptions(status);

-- Table for plan edit history and audit trail
CREATE TABLE IF NOT EXISTS plan_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES auth.users(id),
    change_type VARCHAR(50) NOT NULL, -- 'created' | 'updated' | 'deleted'
    changes JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_plan_changes_plan_id ON plan_changes(plan_id);
CREATE INDEX idx_plan_changes_changed_by ON plan_changes(changed_by);

-- Enable Row Level Security
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_changes ENABLE ROW LEVEL SECURITY;

-- Plans RLS Policies

-- Public view: anyone can see featured active plans
CREATE POLICY "Public view active featured plans"
    ON plans FOR SELECT
    USING (is_active = true AND is_featured = true);

-- Admins can view all plans
CREATE POLICY "Admins view all plans"
    ON plans FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Federation admins can view their federation's plans
CREATE POLICY "Federation admins view federation plans"
    ON plans FOR SELECT
    USING (
        federation_id IN (
            SELECT id FROM federacoes 
            WHERE admin_id = auth.uid()
        )
    );

-- Academy admins can view their academy's plans and federation plans
CREATE POLICY "Academy admins view academy and federation plans"
    ON plans FOR SELECT
    USING (
        plan_scope = 'federation' AND federation_id IN (
            SELECT federation_id FROM academias 
            WHERE admin_id = auth.uid()
        )
        OR
        academy_id IN (
            SELECT id FROM academias 
            WHERE admin_id = auth.uid()
        )
    );

-- Athletes can view available plans for their academy/federation
CREATE POLICY "Athletes view available plans"
    ON plans FOR SELECT
    USING (
        is_active = true AND (
            plan_scope = 'federation' OR
            academy_id IN (
                SELECT academy_id FROM atletas 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Admins can create plans
CREATE POLICY "Admins create plans"
    ON plans FOR INSERT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Federation admins can create federation-wide plans
CREATE POLICY "Federation admins create federation plans"
    ON plans FOR INSERT
    USING (
        federation_id IN (
            SELECT id FROM federacoes 
            WHERE admin_id = auth.uid()
        ) AND plan_scope = 'federation'
    )
    WITH CHECK (
        federation_id IN (
            SELECT id FROM federacoes 
            WHERE admin_id = auth.uid()
        ) AND plan_scope = 'federation'
    );

-- Academy admins can create academy-specific plans
CREATE POLICY "Academy admins create academy plans"
    ON plans FOR INSERT
    USING (
        academy_id IN (
            SELECT id FROM academias 
            WHERE admin_id = auth.uid()
        ) AND plan_scope = 'academy'
    )
    WITH CHECK (
        academy_id IN (
            SELECT id FROM academias 
            WHERE admin_id = auth.uid()
        ) AND plan_scope = 'academy'
    );

-- Admins can update any plan
CREATE POLICY "Admins update plans"
    ON plans FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Federation admins can update their federation plans
CREATE POLICY "Federation admins update their federation plans"
    ON plans FOR UPDATE
    USING (
        federation_id IN (
            SELECT id FROM federacoes 
            WHERE admin_id = auth.uid()
        ) AND plan_scope = 'federation'
    )
    WITH CHECK (
        federation_id IN (
            SELECT id FROM federacoes 
            WHERE admin_id = auth.uid()
        ) AND plan_scope = 'federation'
    );

-- Academy admins can update their academy plans
CREATE POLICY "Academy admins update their academy plans"
    ON plans FOR UPDATE
    USING (
        academy_id IN (
            SELECT id FROM academias 
            WHERE admin_id = auth.uid()
        ) AND plan_scope = 'academy'
    )
    WITH CHECK (
        academy_id IN (
            SELECT id FROM academias 
            WHERE admin_id = auth.uid()
        ) AND plan_scope = 'academy'
    );

-- Subscriptions RLS Policies

-- Users can view their subscriptions
CREATE POLICY "Users view their subscriptions"
    ON plan_subscriptions FOR SELECT
    USING (user_id = auth.uid());

-- Federation admins can view subscriptions to their federation plans
CREATE POLICY "Federation admins view federation subscriptions"
    ON plan_subscriptions FOR SELECT
    USING (
        federation_id IN (
            SELECT id FROM federacoes 
            WHERE admin_id = auth.uid()
        )
    );

-- Academy admins can view subscriptions to their academy plans
CREATE POLICY "Academy admins view academy subscriptions"
    ON plan_subscriptions FOR SELECT
    USING (
        academy_id IN (
            SELECT id FROM academias 
            WHERE admin_id = auth.uid()
        )
    );

-- Users can create subscriptions for themselves
CREATE POLICY "Users create subscriptions"
    ON plan_subscriptions FOR INSERT
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Plan Changes RLS Policies

-- Everyone can view audit trail for active plans
CREATE POLICY "View plan change history"
    ON plan_changes FOR SELECT
    USING (
        plan_id IN (
            SELECT id FROM plans 
            WHERE is_active = true 
            OR federation_id IN (
                SELECT id FROM federacoes 
                WHERE admin_id = auth.uid()
            )
            OR academy_id IN (
                SELECT id FROM academias 
                WHERE admin_id = auth.uid()
            )
        )
    );

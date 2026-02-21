-- Enforce permanent integrity for atletas.user_id
-- 1. Set NOT NULL constraint
ALTER TABLE atletas ALTER COLUMN user_id SET NOT NULL;

-- 2. Enforce uniqueness (one-to-one with auth.users)
ALTER TABLE atletas ADD CONSTRAINT unique_user_id UNIQUE (user_id);

-- 3. (Optional) Add foreign key constraint for referential integrity
ALTER TABLE atletas ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. (Optional) Add a comment for documentation
COMMENT ON COLUMN atletas.user_id IS 'Always matches auth.users.id. Single source of truth for user identity.';

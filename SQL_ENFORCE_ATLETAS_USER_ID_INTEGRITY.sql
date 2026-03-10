-- NOTE (2026-03-09):
-- UNIQUE(user_id) was removed because one authenticated admin can create/manage
-- multiple athletes. Keeping UNIQUE blocked valid inserts with:
-- "duplicate key value violates unique constraint unique_user_id".

-- 1. Keep referential integrity (without uniqueness)
ALTER TABLE atletas
	ADD CONSTRAINT fk_user_id
	FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Keep performance index (non-unique)
CREATE INDEX IF NOT EXISTS idx_atletas_user_id ON atletas(user_id);

-- 3. Documentation
COMMENT ON COLUMN atletas.user_id IS 'Auth user related to athlete record (not unique; one user can register multiple athletes).';

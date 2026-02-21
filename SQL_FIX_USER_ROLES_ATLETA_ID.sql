-- Backfill user_roles.atleta_id for all users with a matching atleta
-- This ensures the portal/atleta/perfil page always loads the correct profile

-- 1. Update existing user_roles rows where user_id matches atletas.user_id
UPDATE user_roles ur
SET atleta_id = a.id
FROM atletas a
WHERE ur.user_id = a.user_id AND (ur.atleta_id IS NULL OR ur.atleta_id <> a.id);

-- 2. (Optional) Insert user_roles for users missing a row (role: 'atleta')
INSERT INTO user_roles (user_id, atleta_id, role)
SELECT a.user_id, a.id, 'atleta'
FROM atletas a
LEFT JOIN user_roles ur ON ur.user_id = a.user_id
WHERE ur.user_id IS NULL;

-- After running, every user with an atleta will have a user_roles row linking them.
-- The frontend profile page will always find the correct atleta for the logged-in user.

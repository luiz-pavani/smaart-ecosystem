-- SQL to find all atletas missing user_id
SELECT id, nome_completo, email, numero_registro
FROM atletas
WHERE user_id IS NULL OR user_id = '';

-- To fix: For each row, you must manually match the atleta to the correct user in the auth.users table and update the user_id field.
-- Example update (replace values accordingly):
-- UPDATE atletas SET user_id = '<auth_user_id>' WHERE id = '<atleta_id>';

-- To automate: If email is unique and matches between atletas and auth.users, you can run:
-- (WARNING: Review before running in production!)
UPDATE atletas a
SET user_id = u.id
FROM auth.users u
WHERE a.user_id IS NULL AND a.email = u.email;

-- After running, re-run the consistency test script to verify all atletas have user_id.

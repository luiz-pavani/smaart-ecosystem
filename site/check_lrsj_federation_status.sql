-- Check if your user has the correct federacao_id in user_roles
SELECT user_id, federacao_id
FROM user_roles
WHERE federacao_id = '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d';

-- Check if user_fed_lrsj has valid athlete records
SELECT id, nome_completo, graduacao, academia_id, federacao_id
FROM user_fed_lrsj
WHERE federacao_id = '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d'
LIMIT 10;
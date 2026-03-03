-- Verificar academias existentes
SELECT DISTINCT academias, COUNT(*) as total_atletas
FROM user_fed_lrsj
WHERE academias IS NOT NULL AND academias != ''
GROUP BY academias
ORDER BY total_atletas DESC;

-- Migration: Mapear logos das academias
-- Bucket: academias-logos

-- Limpar mapeamentos antigos (se existirem)
TRUNCATE TABLE public.academy_logos;

-- Mapear logos pelas siglas das academias
-- Formato: academia_nome deve corresponder ao valor em user_fed_lrsj.academias

-- LRSJ - Liga Riograndense de Judô
INSERT INTO public.academy_logos (academia_nome, logo_url, logo_width, logo_height)
VALUES 
('LRSJ', 'academias-logos/LRSJ.png', 200, 200);

-- Circuito Sul
INSERT INTO public.academy_logos (academia_nome, logo_url, logo_width, logo_height)
VALUES 
('Circuito Sul', 'academias-logos/SUL.png', 200, 200);

-- Santa Maria Judô (Atlética Falcons)
INSERT INTO public.academy_logos (academia_nome, logo_url, logo_width, logo_height)
VALUES 
('Santa Maria Judô', 'academias-logos/atletica-falcons.png', 200, 200);

-- SMJ (possível variação)
INSERT INTO public.academy_logos (academia_nome, logo_url, logo_width, logo_height)
VALUES 
('SMJ', 'academias-logos/atletica-falcons.png', 200, 200)
ON CONFLICT (academia_nome) DO NOTHING;

-- Adicionar outros logos conforme necessário
-- Copie o padrão abaixo e ajuste:
-- INSERT INTO public.academy_logos (academia_nome, logo_url, logo_width, logo_height)
-- VALUES ('NOME_EXATO_DA_ACADEMIA', 'academias-logos/SIGLA.png', 200, 200);

COMMENT ON TABLE public.academy_logos IS 'Mapeamento de academias para logos no bucket academias-logos. O campo academia_nome deve corresponder exatamente ao valor em user_fed_lrsj.academias';

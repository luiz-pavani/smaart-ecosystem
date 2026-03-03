-- Migration: Mapear logos das academias BY SIGLA
-- Bucket: academias-logos
-- Padrão de arquivo: [SIGLA].png

-- Limpar mapeamentos antigos
TRUNCATE TABLE public.academy_logos;

-- =====================================================
-- MAPEAMENTO COMPLETO: Todas as 32 academias
-- =====================================================

INSERT INTO public.academy_logos (academia_nome, logo_url, logo_width, logo_height)
VALUES 
-- Organizações
('LRSJ', 'academias-logos/LRSJ.png', 200, 200),
('Circuito Sul', 'academias-logos/SUL.png', 200, 200),

-- Academias A-D
('Equipe Abreu', 'academias-logos/ABR.png', 200, 200),
('Academia de Judô Judokan', 'academias-logos/AJJ.png', 200, 200),
('Bandeira Social', 'academias-logos/BSO.png', 200, 200),
('Associação Combat de Artes Marciais', 'academias-logos/CBT.png', 200, 200),
('CaJu', 'academias-logos/CJU.png', 200, 200),
('Dojo Cáceres Moraes', 'academias-logos/DCM.png', 200, 200),
('DW Artes Marciais', 'academias-logos/DWA.png', 200, 200),
('Dojô Toriuke', 'academias-logos/DTU.png', 200, 200),

-- Academias F-G
('Atlética Falcons Judô', 'academias-logos/FAL.png', 200, 200),
('Garra Team', 'academias-logos/GAR.png', 200, 200),

-- Academias I-K
('Intendencia Departamental de Rivera', 'academias-logos/IDR.png', 200, 200),
('Judô Castelo Branco', 'academias-logos/JCB.png', 200, 200),
('Judokan Uruguay', 'academias-logos/JDK.png', 200, 200),
('Judô MadMax', 'academias-logos/JMM.png', 200, 200),
('Kodokan Escola de Judô', 'academias-logos/KEJ.png', 200, 200),
('Judô Kenkō', 'academias-logos/KEN.png', 200, 200),
('Koyama Judô', 'academias-logos/KOY.png', 200, 200),

-- Academias N-P
('Nihon Judô', 'academias-logos/NHN.png', 200, 200),
('OSL Judô', 'academias-logos/OSL.png', 200, 200),
('OSS Escola de Artes Marciais', 'academias-logos/OSS.png', 200, 200),
('Plaza de Deportes Rivera', 'academias-logos/PDR.png', 200, 200),
('Projeto Judocas do Futuro', 'academias-logos/PJF.png', 200, 200),
('Judô Progresso', 'academias-logos/PRG.png', 200, 200),

-- Academias S-T
('Equipe de Judô Sensei Adilson Leite', 'academias-logos/SAL.png', 200, 200),
('Samurai Dojô', 'academias-logos/SAM.png', 200, 200),
('Santa Maria Judô', 'academias-logos/SMJ.png', 200, 200),
('Academia Sol Nascente de Judô', 'academias-logos/SOL.png', 200, 200),
('Sapucaia do Sul Judô', 'academias-logos/SSJ.png', 200, 200),
('Tanemaki Judô', 'academias-logos/TAN.png', 200, 200),
('Thork Jiu-Jitsu', 'academias-logos/THO.png', 200, 200),
('Tora Judô Ltda', 'academias-logos/TOR.png', 200, 200)

ON CONFLICT (academia_nome) DO UPDATE 
SET 
  logo_url = EXCLUDED.logo_url,
  logo_width = EXCLUDED.logo_width,
  logo_height = EXCLUDED.logo_height;

COMMENT ON TABLE public.academy_logos IS 'Mapeamento completo: 32 academias + LRSJ + Circuito Sul. Arquivos no bucket academias-logos no formato [SIGLA].png';

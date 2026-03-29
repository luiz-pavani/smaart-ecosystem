-- Migration 018: Create federation_schedule table and seed with LRSJ 2026 schedule
-- Run at: https://app.supabase.com/project/risvafrrbnozyjquxvzi/sql

CREATE TABLE IF NOT EXISTS public.federation_schedule (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  title text NOT NULL,
  description text,
  date date NOT NULL,
  start_time text,
  location text,
  type text,
  graduation_level text[],
  link text,
  modality text
);

-- Enable RLS
ALTER TABLE public.federation_schedule ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Authenticated can read schedule"
  ON public.federation_schedule FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update/delete (admin via API)
-- (no insert policy = only service_role can write)

-- Seed: Cronograma Oficial LRSJ 2026
INSERT INTO public.federation_schedule (title, description, date, start_time, location, type, graduation_level, link, modality) VALUES
('Seminário de Lançamento do Processo de Graduação 2026', 'Abertura oficial do Processo de Graduação 2026.', '2026-01-26', '19:00', 'Google Meet', 'seminario', ARRAY['shodan','nidan','sandan','yondan','godan','rokudan'], 'https://meet.google.com/mez-sjmv-ifr', 'Online (Geral)'),
('Curso de Oficiais de Competição (Mód 1/2)', 'Módulo teórico online.', '2026-01-26', '20:00', 'Google Meet', 'curso', ARRAY['shodan'], 'https://meet.google.com/vbx-tfuj-yft', 'Online (Geral)'),
('Credenciamento Técnico 2026 (dia 1)', 'Curso de Arbitragem e Atualização (Dia 1).', '2026-02-07', '00:00', 'Santa Maria/RS', 'treino', ARRAY['shodan','nidan','sandan','yondan','godan','rokudan'], NULL, 'Presencial'),
('Credenciamento Técnico 2026 (dia 2)', 'Curso de Oficiais (Dia 2).', '2026-02-08', '00:00', 'Santa Maria/RS', 'treino', ARRAY['shodan','nidan'], NULL, 'Presencial'),
('Reunião de Árbitros: Copa Verão', 'Módulo teórico online.', '2026-02-21', '00:00', 'Google Meet', 'reuniao', ARRAY['shodan','nidan','sandan'], NULL, 'Online (Geral)'),
('Estágio: Copa Verão', 'Atuação prática supervisionada.', '2026-02-22', '00:00', 'Litoral/RS', 'estagio', ARRAY['shodan','nidan','sandan'], NULL, 'Estágio'),
('Curso de Arbitragem (2/5)', 'Módulo teórico online.', '2026-03-02', '00:00', 'Profep', 'curso', ARRAY['shodan','nidan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Metodologia Japonesa de Ensino (1/6)', 'Módulo com Yuko Fujii.', '2026-03-02', '00:00', 'Profep', 'curso', ARRAY['sandan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Curso de Arbitragem (3/5)', 'Módulo teórico online.', '2026-03-09', '00:00', 'Profep', 'curso', ARRAY['shodan','nidan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Metodologia Japonesa de Ensino (2/6)', 'Módulo com Yuko Fujii.', '2026-03-09', '00:00', 'Profep', 'curso', ARRAY['sandan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Reunião de Árbitros: Copa Missões', 'Módulo teórico online.', '2026-03-21', '00:00', 'Google Meet', 'reuniao', ARRAY['shodan','nidan','sandan'], NULL, 'Online (Geral)'),
('Estágio: Copa Missões', 'Atuação prática supervisionada.', '2026-03-22', '00:00', 'Trindade do Sul/RS', 'estagio', ARRAY['shodan','nidan','sandan'], NULL, 'Estágio'),
('Curso de Terminologia do Judô', 'Módulo teórico online.', '2026-03-30', '00:00', 'Profep', 'curso', ARRAY['shodan','nidan','sandan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Curso de Arbitragem (4/5)', 'Módulo teórico online.', '2026-04-06', '00:00', 'Profep', 'curso', ARRAY['shodan','nidan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Metodologia Japonesa de Ensino (3/6)', 'Módulo com Yuko Fujii.', '2026-04-06', '00:00', 'Profep', 'curso', ARRAY['sandan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Curso de Arbitragem (5/5)', 'Módulo teórico online.', '2026-04-13', '00:00', 'Profep', 'curso', ARRAY['shodan','nidan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Metodologia Japonesa de Ensino (4/6)', 'Módulo com Yuko Fujii.', '2026-04-13', '00:00', 'Profep', 'curso', ARRAY['sandan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Reunião de Árbitros: Copa Uruguaiana', 'Módulo teórico online.', '2026-04-18', '00:00', 'Google Meet', 'reuniao', ARRAY['shodan','nidan','sandan'], NULL, 'Online (Geral)'),
('Estágio: Copa Uruguaiana', 'Atuação prática supervisionada.', '2026-04-19', '00:00', 'Uruguaiana/RS', 'estagio', ARRAY['shodan','nidan','sandan'], NULL, 'Estágio'),
('Curso de Kata (Online)', 'Módulo teórico online.', '2026-04-27', '00:00', 'Profep', 'curso', ARRAY['shodan','nidan','sandan','yondan','godan','rokudan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Curso de Waza (1/6)', 'Módulo teórico online.', '2026-05-11', '00:00', 'Profep', 'curso', ARRAY['shodan','nidan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Metodologia Japonesa de Ensino (5/6)', 'Módulo com Yuko Fujii.', '2026-05-11', '00:00', 'Profep', 'curso', ARRAY['sandan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Reunião de Árbitros: S. Copa Santa Maria', 'Módulo teórico online.', '2026-05-16', '00:00', 'Google Meet', 'reuniao', ARRAY['shodan','nidan','sandan'], NULL, 'Online (Geral)'),
('Estágio: Super Copa Santa Maria', 'Atuação prática supervisionada.', '2026-05-17', '00:00', 'Santa Maria/RS', 'estagio', ARRAY['shodan','nidan','sandan'], NULL, 'Estágio'),
('Workshop Presencial de Waza e Kata (dia 1)', 'Prática intensiva.', '2026-05-23', '00:00', 'Canoas/RS', 'treino', ARRAY['shodan','nidan','sandan','yondan','godan','rokudan'], NULL, 'Presencial'),
('Workshop Presencial de Waza e Kata (dia 2)', 'Prática intensiva.', '2026-05-24', '00:00', 'Canoas/RS', 'treino', ARRAY['shodan','nidan','sandan','yondan','godan','rokudan'], NULL, 'Presencial'),
('Curso de Waza (2/6)', 'Módulo teórico online.', '2026-06-08', '00:00', 'Profep', 'curso', ARRAY['shodan','nidan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Metodologia Japonesa de Ensino (6/6)', 'Módulo com Yuko Fujii.', '2026-06-08', '00:00', 'Profep', 'curso', ARRAY['sandan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Reunião de Árbitros: C. Sul-Brasileiro', 'Módulo teórico online.', '2026-06-20', '00:00', 'Google Meet', 'reuniao', ARRAY['shodan','nidan','sandan'], NULL, 'Online (Geral)'),
('Estágio: Campeonato Sul-Brasileiro', 'Atuação prática supervisionada.', '2026-06-21', '00:00', 'Canoas/RS', 'estagio', ARRAY['shodan','nidan','sandan'], NULL, 'Estágio'),
('Curso de Waza (3/6)', 'Módulo teórico online.', '2026-06-22', '00:00', 'Profep', 'curso', ARRAY['shodan','nidan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Fundamentos da Adm. Esportiva (1/3)', 'Curso do Instituto Olímpico.', '2026-06-22', '00:00', 'Plataforma COB', 'curso', ARRAY['sandan'], 'https://www.cob.org.br/cultura-educacao/iob#cursos', 'Online (COB)'),
('Curso de Waza (4/6)', 'Módulo teórico online.', '2026-06-29', '00:00', 'Profep', 'curso', ARRAY['shodan','nidan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Fundamentos da Adm. Esportiva (2/3)', 'Curso do Instituto Olímpico.', '2026-06-29', '00:00', 'Plataforma COB', 'curso', ARRAY['sandan'], 'https://www.cob.org.br/cultura-educacao/iob#cursos', 'Online (COB)'),
('Reunião de Árbitros: Copa Serra', 'Módulo teórico online.', '2026-07-11', '00:00', 'Google Meet', 'reuniao', ARRAY['shodan','nidan','sandan'], NULL, 'Online (Geral)'),
('Estágio: Copa Serra', 'Atuação prática supervisionada.', '2026-07-12', '00:00', 'Serra/RS', 'estagio', ARRAY['shodan','nidan','sandan'], NULL, 'Estágio'),
('Workshop Presencial de Waza e Kata (dia 1)', 'Prática intensiva em Santa Maria.', '2026-07-25', '00:00', 'Santa Maria/RS', 'treino', ARRAY['shodan','nidan','sandan','yondan','godan','rokudan'], NULL, 'Presencial'),
('Workshop Presencial de Waza e Kata (dia 2)', 'Prática intensiva em Santa Maria.', '2026-07-26', '00:00', 'Santa Maria/RS', 'treino', ARRAY['shodan','nidan','sandan','yondan','godan','rokudan'], NULL, 'Presencial'),
('Fundamentos da Adm. Esportiva (3/3)', 'Módulo teórico online.', '2026-08-10', '00:00', 'Plataforma COB', 'curso', ARRAY['sandan'], 'https://www.cob.org.br/cultura-educacao/iob#cursos', 'Online (COB)'),
('Combate à Manipulação de Resultados', 'Módulo teórico online.', '2026-08-10', '00:00', 'Plataforma COB', 'curso', ARRAY['shodan','nidan'], 'https://www.cob.org.br/cultura-educacao/iob#cursos', 'Online (COB)'),
('Reunião de Árbitros: Open Rivera', 'Módulo teórico online.', '2026-08-15', '00:00', 'Google Meet', 'reuniao', ARRAY['shodan','nidan','sandan'], NULL, 'Online (Geral)'),
('Estágio: Open Rivera', 'Atuação prática supervisionada.', '2026-08-16', '00:00', 'Rivera/URU', 'estagio', ARRAY['shodan','nidan','sandan'], NULL, 'Estágio'),
('Curso de Waza (5/6)', 'Módulo teórico online.', '2026-08-24', '00:00', 'Profep', 'curso', ARRAY['shodan','nidan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Gestão de Eventos Esportivos (1/2)', 'Módulo teórico online.', '2026-08-24', '00:00', 'Profep', 'curso', ARRAY['sandan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Copa Hacoaj Internacional', 'Evento não obrigatório.', '2026-09-12', '00:00', 'Buenos Aires/ARG', 'campeonato', ARRAY['shodan','nidan','sandan'], NULL, 'Presencial'),
('Gestão de Eventos Esportivos (2/2)', 'Módulo teórico online.', '2026-09-14', '00:00', 'Profep', 'curso', ARRAY['sandan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Curso de Waza (6/6)', 'Módulo teórico online.', '2026-09-14', '00:00', 'Profep', 'curso', ARRAY['shodan','nidan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Workshop Presencial de Waza e Kata (dia 1)', 'Revisão geral pré-exame.', '2026-09-19', '00:00', 'SM e Canoas/RS', 'treino', ARRAY['shodan','nidan','sandan','yondan','godan','rokudan'], NULL, 'Presencial'),
('Workshop Presencial de Waza e Kata (dia 2)', 'Revisão geral pré-exame.', '2026-09-20', '00:00', 'SM e Canoas/RS', 'treino', ARRAY['shodan','nidan','sandan','yondan','godan','rokudan'], NULL, 'Presencial'),
('Curso de 1ºs Socorros', 'Atendimento pré-hospitalar.', '2026-09-28', '00:00', 'Profep', 'curso', ARRAY['shodan','nidan','sandan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Esporte Antirracista (1/2)', 'Ética e inclusão.', '2026-10-05', '00:00', 'Plataforma COB', 'curso', ARRAY['shodan'], 'https://www.cob.org.br/cultura-educacao/iob#cursos', 'Online (COB)'),
('Comissão de Atletas (1/2)', 'Representatividade.', '2026-10-05', '00:00', 'Plataforma COB', 'curso', ARRAY['nidan'], 'https://www.cob.org.br/cultura-educacao/iob#cursos', 'Online (COB)'),
('Gestão de Projetos Sociais (1/2)', 'Elaboração de projetos.', '2026-10-05', '00:00', 'Profep', 'curso', ARRAY['sandan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Reunião de Árbitros: Camp. Estadual', 'Módulo teórico online.', '2026-10-10', '00:00', 'Google Meet', 'reuniao', ARRAY['shodan','nidan','sandan'], NULL, 'Online (Geral)'),
('Estágio: Campeonato Estadual', 'Atuação prática supervisionada.', '2026-10-11', '00:00', 'Santa Maria/RS', 'estagio', ARRAY['shodan','nidan','sandan'], NULL, 'Estágio'),
('Esporte Antirracista (2/2)', 'Ética e inclusão.', '2026-10-19', '00:00', 'Plataforma COB', 'curso', ARRAY['shodan'], 'https://www.cob.org.br/cultura-educacao/iob#cursos', 'Online (COB)'),
('Comissão de Atletas (2/2)', 'Representatividade.', '2026-10-19', '00:00', 'Plataforma COB', 'curso', ARRAY['nidan'], 'https://www.cob.org.br/cultura-educacao/iob#cursos', 'Online (COB)'),
('Gestão de Projetos Sociais (2/2)', 'Elaboração de projetos.', '2026-10-19', '00:00', 'Profep', 'curso', ARRAY['sandan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Igualdade de Gênero', 'Ética e inclusão.', '2026-10-26', '00:00', 'Plataforma COB', 'curso', ARRAY['shodan','nidan','sandan','yondan','godan','rokudan'], 'https://www.cob.org.br/cultura-educacao/iob#cursos', 'Online (COB)'),
('Diferenças entre Técnicas Semelhantes', 'Módulo teórico online.', '2026-10-26', '00:00', 'Profep', 'curso', ARRAY['sandan'], 'https://www.profepmax.com.br/', 'Online (Geral)'),
('Exames de Graduação', 'Banca Examinadora Final.', '2026-11-14', '00:00', 'Santa Maria/RS', 'exame', ARRAY['shodan','nidan','sandan','yondan','godan','rokudan'], NULL, 'Presencial'),
('Reunião de Árbitros: Copa dos Campeões', 'Módulo teórico online.', '2026-12-05', '00:00', 'Google Meet', 'reuniao', ARRAY['shodan','nidan','sandan'], NULL, 'Online (Geral)'),
('Estágio: Copa dos Campeões', 'Atuação prática supervisionada.', '2026-12-06', '00:00', 'Santa Maria/RS', 'estagio', ARRAY['shodan','nidan','sandan'], NULL, 'Estágio'),
('Encerramento e Diplomação', 'Cerimônia de entrega de faixas.', '2026-12-06', '00:00', 'Santa Maria/RS', 'exame', ARRAY['shodan','nidan','sandan','yondan','godan','rokudan'], NULL, 'Presencial');

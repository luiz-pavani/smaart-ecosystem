-- Torna todos os campos do CSV NULLABLE na tabela atletas
ALTER TABLE public.atletas ALTER COLUMN member_no DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN graduacao DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN dan DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN city DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN province DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN birthdate DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN age DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN gender DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN member_since DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN nationality DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN residence DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN plan DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN plan_status DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN expire_date DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN member_status DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN academies DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN identidade_url DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN patch_size DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN patch_name DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN foto_url DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN arbitragem_nivel DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN certificado_dan DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN observacoes DROP NOT NULL;
ALTER TABLE public.atletas ALTER COLUMN lote DROP NOT NULL;
-- Torna academia_id nullable
ALTER TABLE public.atletas ALTER COLUMN academia_id DROP NOT NULL;

ALTER TABLE public.atletas
ADD COLUMN IF NOT EXISTS member_no varchar(50),
ADD COLUMN IF NOT EXISTS graduacao varchar(50),
ADD COLUMN IF NOT EXISTS dan varchar(20),
ADD COLUMN IF NOT EXISTS name varchar(255),
ADD COLUMN IF NOT EXISTS email varchar(255),
ADD COLUMN IF NOT EXISTS phone varchar(50),
ADD COLUMN IF NOT EXISTS city varchar(100),
ADD COLUMN IF NOT EXISTS province varchar(10),
ADD COLUMN IF NOT EXISTS birthdate date,
ADD COLUMN IF NOT EXISTS age integer,
ADD COLUMN IF NOT EXISTS gender varchar(20),
ADD COLUMN IF NOT EXISTS member_since timestamp,
ADD COLUMN IF NOT EXISTS nationality varchar(50),
ADD COLUMN IF NOT EXISTS residence varchar(100),
ADD COLUMN IF NOT EXISTS plan varchar(100),
ADD COLUMN IF NOT EXISTS plan_status varchar(50),
ADD COLUMN IF NOT EXISTS expire_date date,
ADD COLUMN IF NOT EXISTS member_status varchar(50),
ADD COLUMN IF NOT EXISTS academies text,
ADD COLUMN IF NOT EXISTS identidade_url text,
ADD COLUMN IF NOT EXISTS patch_size varchar(50),
ADD COLUMN IF NOT EXISTS patch_name varchar(100),
ADD COLUMN IF NOT EXISTS foto_url text,
ADD COLUMN IF NOT EXISTS arbitragem_nivel varchar(50),
ADD COLUMN IF NOT EXISTS certificado_dan text,
ADD COLUMN IF NOT EXISTS observacoes text,
ADD COLUMN IF NOT EXISTS lote varchar(50);

-- Torna federacao_id nullable
ALTER TABLE public.atletas ALTER COLUMN federacao_id DROP NOT NULL;

-- =================================================================================
-- VOU LUTAR - SUPABASE SCHEMA (Perfis e Eventos com RLS)
-- =================================================================================

-- 1. Tabela de Perfis (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  role text not null default 'atleta' check (role in ('atleta', 'organizador', 'admin')),
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ativar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (Profiles)
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING ( true );

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id );


-- 2. Tabela de Eventos (Events)
CREATE TABLE IF NOT EXISTS public.events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  date date not null,
  category text not null,
  location text not null,
  registration_url text not null,
  poster_url text,
  is_featured boolean default false,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ativar RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (Events)

-- A) Qualquer pessoa (visitantes) pode VER eventos publicados
CREATE POLICY "Eventos publicados são visíveis para todos"
  ON public.events FOR SELECT
  USING ( status = 'published' );

-- B) Organizadores podem VER seus próprios eventos (mesmo pendentes)
CREATE POLICY "Organizadores veem seus próprios eventos"
  ON public.events FOR SELECT
  USING ( auth.uid() = user_id );

-- C) Apenas usuários com role 'organizador' podem INSERIR eventos
-- (Para permitir que qualquer usuário logado insira e seja checado depois, você pode usar auth.uid() is not null)
CREATE POLICY "Organizadores podem inserir eventos"
  ON public.events FOR INSERT
  WITH CHECK ( 
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'organizador')
  );

-- D) Organizadores só podem ATUALIZAR seus próprios eventos
CREATE POLICY "Organizadores podem atualizar próprios eventos"
  ON public.events FOR UPDATE
  USING ( auth.uid() = user_id );

-- E) Organizadores só podem DELETAR seus próprios eventos
CREATE POLICY "Organizadores podem deletar próprios eventos"
  ON public.events FOR DELETE
  USING ( auth.uid() = user_id );


-- 3. Storage: Bucket para Cartazes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-posters', 'event-posters', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage
CREATE POLICY "Qualquer pessoa pode visualizar cartazes"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'event-posters' );

CREATE POLICY "Organizadores logados podem fazer upload de cartazes"
  ON storage.objects FOR INSERT
  WITH CHECK ( 
    bucket_id = 'event-posters' AND auth.role() = 'authenticated'
  );

-- 4. Função e Trigger para Auto-criar Profile
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''), 
    COALESCE(new.raw_user_meta_data->>'role', 'organizador')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove o trigger se existir para evitar erros
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

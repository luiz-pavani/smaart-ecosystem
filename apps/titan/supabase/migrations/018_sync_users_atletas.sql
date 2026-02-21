-- Trigger: Sincroniza email e nome entre users (Supabase Auth) e atletas
-- Sempre que o email ou nome do usuário for alterado em users, atualiza automaticamente em atletas

CREATE OR REPLACE FUNCTION sync_atleta_from_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE atletas
  SET email = NEW.email,
      nome_completo = COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  WHERE atletas.cpf = NEW.raw_user_meta_data->>'cpf';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_atleta_from_user ON auth.users;
CREATE TRIGGER trigger_sync_atleta_from_user
AFTER UPDATE OF email, raw_user_meta_data ON auth.users
FOR EACH ROW
EXECUTE FUNCTION sync_atleta_from_user();

-- Opcional: Trigger reverso (atualização em atletas reflete em users)
-- Só use se quiser bidirecionalidade total
-- Exemplo:
-- CREATE OR REPLACE FUNCTION sync_user_from_atleta()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   UPDATE auth.users
--   SET email = NEW.email,
--       raw_user_meta_data = jsonb_set(raw_user_meta_data, '{name}', to_jsonb(NEW.nome_completo))
--   WHERE auth.users.id = NEW.created_by;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- DROP TRIGGER IF EXISTS trigger_sync_user_from_atleta ON atletas;
-- CREATE TRIGGER trigger_sync_user_from_atleta
-- AFTER UPDATE OF email, nome_completo ON atletas
-- FOR EACH ROW
-- EXECUTE FUNCTION sync_user_from_atleta();

#!/usr/bin/env python3
"""
🚀 Script para executar migrations de frequência no Supabase
Uso: python3 run_migration.py
"""

import os
import sys
import subprocess
from pathlib import Path

# Cores para output
GREEN = '\033[0;32m'
RED = '\033[0;31m'
BLUE = '\033[0;34m'
YELLOW = '\033[1;33m'
NC = '\033[0m'  # No Color

def print_header(text):
    print(f"\n{BLUE}{'='*50}{NC}")
    print(f"{BLUE}{text}{NC}")
    print(f"{BLUE}{'='*50}{NC}\n")

def print_success(text):
    print(f"{GREEN}✅ {text}{NC}")

def print_error(text):
    print(f"{RED}❌ {text}{NC}")

def print_warning(text):
    print(f"{YELLOW}⚠️  {text}{NC}")

def print_info(text):
    print(f"{BLUE}ℹ️  {text}{NC}")

def main():
    print_header("🚀 EXECUTOR DE MIGRATIONS - FREQUÊNCIA")
    
    # Verificar se estamos no diretório correto
    migration_file = Path("apps/titan/supabase/migrations/010_frequencia_acesso.sql")
    if not migration_file.exists():
        print_error(f"Arquivo não encontrado: {migration_file}")
        print_info("Execute este script a partir da raiz do projeto")
        sys.exit(1)
    
    print_success(f"Arquivo de migration encontrado: {migration_file}")
    
    # Verificar se Supabase CLI está disponível
    print_info("Verificando Supabase CLI...")
    result = subprocess.run(["supabase", "--version"], capture_output=True, text=True)
    if result.returncode != 0:
        print_error("Supabase CLI não encontrado ou não está no PATH")
        print_info("Instale com: brew install supabase/tap/supabase")
        sys.exit(1)
    
    print_success(f"Supabase CLI encontrado: {result.stdout.strip()}")
    
    # OPÇÃO 1: Usar psql com credenciais do Supabase
    print_header("OPÇÃO 1: Executar via psql (SQL direto)")
    
    print_warning("Para usar esta opção, você precisa de:")
    print("  - SUPABASE_URL")
    print("  - SUPABASE_KEY (ou fazer via console web)")
    print_info("Recomendado: Use o Supabase Console web (mais seguro)")
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if supabase_url and supabase_key:
        print_info("Variáveis de ambiente encontradas")
        print_info("Tentando executar migration...")
        
        try:
            with open(migration_file, 'r') as f:
                sql_content = f.read()
            
            # Seria necessário usar psql ou similar
            # Por segurança, vamos apenas mostrar instruções
            print_warning("Execução automática desativada por segurança")
            
        except Exception as e:
            print_error(f"Erro ao ler arquivo: {e}")
            sys.exit(1)
    else:
        print_warning("Variáveis SUPABASE_URL e SUPABASE_KEY não encontradas")
        print("Definir: export SUPABASE_URL=... && export SUPABASE_KEY=...")
    
    # OPÇÃO 2: Instruções para console web
    print_header("OPÇÃO 2: Via Supabase Console Web (RECOMENDADO)")
    
    instructions = """
1️⃣  Acesse: https://app.supabase.com
2️⃣  Selecione o projeto: Titan Academy
3️⃣  Menu lateral → SQL Editor
4️⃣  Clique em "+ New Query"
5️⃣  Cole o seguinte SQL e clique "RUN":
"""
    print(instructions)
    
    print(f"{YELLOW}--- SQL A EXECUTAR ---{NC}")
    with open(migration_file, 'r') as f:
        print(f.read())
    print(f"{YELLOW}--- FIM SQL ---{NC}")
    
    print(f"\n{GREEN}✅ Se viu \"Query executed successfully\", migration foi bem-sucedida!{NC}\n")
    
    # OPÇÃO 3: Via arquivo local .sql
    print_header("OPÇÃO 3: Copiar arquivo para Supabase Storage")
    
    print_info("Arquivo SQL pronto em: " + str(migration_file.absolute()))
    print_info("Copie e cole no Supabase Console → SQL Editor")
    
    # OPÇÃO 4: Verificação pós-execução
    print_header("VERIFICAÇÃO PÓS-EXECUÇÃO")
    
    verify_sql = """
-- Execute esta query para validar:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('frequencia', 'sessoes_qr')
ORDER BY table_name;

-- Resultado esperado:
-- table_name
-- -----------
-- frequencia
-- sessoes_qr
"""
    
    print("Cole esta query no console para validar:")
    print(f"{YELLOW}{verify_sql}{NC}")
    
    print_header("PRÓXIMOS PASSOS")
    print("""
1. Execute o SQL acima no Supabase Console
2. Valide com a query de verificação
3. Teste no navegador: https://titan.smaartpro.com/dashboard/modulo-acesso
4. Veja também o histórico: /dashboard/modulo-acesso/frequencia
""")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Operação cancelada pelo usuário{NC}")
        sys.exit(0)
    except Exception as e:
        print_error(f"Erro inesperado: {e}")
        sys.exit(1)

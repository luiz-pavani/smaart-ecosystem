#!/usr/bin/env python3
"""
Script para migrar fotos dos atletas do SmoothComp para Supabase Storage

Funcionalidades:
- Baixa fotos dos atletas do SmoothComp
- Faz upload para Supabase Storage
- Atualiza URLs no banco de dados
- Mostra progresso e logs
- Pode ser pausado/retomado
"""

import os
import sys
import time
import requests
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Configurações do Supabase
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Service role key para bypass RLS

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Erro: Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env")
    sys.exit(1)

# Inicializa cliente Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Nome do bucket no Supabase Storage
STORAGE_BUCKET = "athlete-photos"

# Diretório temporário para download
TEMP_DIR = Path("./temp_photos")
TEMP_DIR.mkdir(exist_ok=True)


def create_storage_bucket():
    """Cria o bucket no Supabase Storage se não existir"""
    try:
        # Tenta criar o bucket (se já existir, vai dar erro mas podemos ignorar)
        print(f"📦 Verificando/criando bucket '{STORAGE_BUCKET}'...")
        try:
            supabase.storage.create_bucket(
                STORAGE_BUCKET,
                options={"public": True}  # Bucket público para acesso direto às imagens
            )
            print(f"✅ Bucket '{STORAGE_BUCKET}' criado com sucesso!")
        except Exception as create_error:
            # Se o bucket já existe, é ok
            if "already exists" in str(create_error).lower() or "duplicate" in str(create_error).lower():
                print(f"✅ Bucket '{STORAGE_BUCKET}' já existe")
            else:
                raise create_error
        return True
    except Exception as e:
        print(f"❌ Erro ao criar bucket: {e}")
        return False


def download_image(url: str, filepath: Path) -> bool:
    """
    Baixa uma imagem da URL do SmoothComp
    
    Args:
        url: URL da imagem no SmoothComp
        filepath: Caminho local para salvar
    
    Returns:
        True se baixou com sucesso, False caso contrário
    """
    try:
        # Headers para simular um navegador
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Referer': 'https://smoothcomp.com/'
        }
        
        response = requests.get(url, headers=headers, timeout=30, allow_redirects=True)
        
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                f.write(response.content)
            return True
        else:
            print(f"   ⚠️  Status {response.status_code} ao baixar {url}")
            return False
            
    except Exception as e:
        print(f"   ❌ Erro ao baixar {url}: {e}")
        return False


def upload_to_supabase(filepath: Path, athlete_id: int, file_extension: str) -> str | None:
    """
    Faz upload de uma imagem para o Supabase Storage
    
    Args:
        filepath: Caminho do arquivo local
        athlete_id: ID do atleta
        file_extension: Extensão do arquivo (.jpg, .png, etc)
    
    Returns:
        URL pública da imagem ou None se falhar
    """
    try:
        # Nome do arquivo no storage: atleta_{id}.{ext}
        storage_path = f"atleta_{athlete_id}{file_extension}"
        
        # Lê o arquivo
        with open(filepath, 'rb') as f:
            file_data = f.read()
        
        # Upload para o Supabase Storage
        supabase.storage.from_(STORAGE_BUCKET).upload(
            storage_path,
            file_data,
            file_options={"content-type": f"image/{file_extension.replace('.', '')}"}
        )
        
        # Obtém a URL pública
        public_url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)
        
        return public_url
        
    except Exception as e:
        # Tenta remover e fazer upload novamente (caso já exista)
        try:
            supabase.storage.from_(STORAGE_BUCKET).remove([storage_path])
            return upload_to_supabase(filepath, athlete_id, file_extension)
        except:
            print(f"   ❌ Erro ao fazer upload: {e}")
            return None


def update_athlete_photo_url(athlete_id: int, new_url: str) -> bool:
    """
    Atualiza a URL da foto do atleta no banco de dados
    
    Args:
        athlete_id: ID do atleta
        new_url: Nova URL da foto
    
    Returns:
        True se atualizou com sucesso
    """
    try:
        supabase.table("user_fed_lrsj").update({
            "url_foto": new_url
        }).eq("id", athlete_id).execute()
        return True
    except Exception as e:
        print(f"   ❌ Erro ao atualizar banco: {e}")
        return False


def get_file_extension(url: str, content_type: str = None) -> str:
    """Detecta a extensão do arquivo pela URL ou content-type"""
    if content_type:
        if 'jpeg' in content_type or 'jpg' in content_type:
            return '.jpg'
        elif 'png' in content_type:
            return '.png'
        elif 'webp' in content_type:
            return '.webp'
    
    # Fallback: tentar pela URL
    if '.jpg' in url.lower() or '.jpeg' in url.lower():
        return '.jpg'
    elif '.png' in url.lower():
        return '.png'
    elif '.webp' in url.lower():
        return '.webp'
    
    return '.jpg'  # Default


def migrate_photos():
    """Função principal para migrar todas as fotos"""
    
    print("🚀 Iniciando migração de fotos dos atletas\n")
    
    # Cria bucket se não existir
    if not create_storage_bucket():
        return
    
    print("\n📊 Buscando atletas com fotos...")
    
    # Busca todos os atletas que têm url_foto
    response = supabase.table("user_fed_lrsj").select(
        "id, numero_membro, nome_completo, url_foto"
    ).not_.is_("url_foto", "null").execute()
    
    athletes = response.data
    total = len(athletes)
    
    print(f"✅ Encontrados {total} atletas com fotos\n")
    
    if total == 0:
        print("Nenhum atleta com foto para migrar.")
        return
    
    # Contadores
    success = 0
    failed = 0
    skipped = 0
    
    # Migra cada foto
    for i, athlete in enumerate(athletes, 1):
        athlete_id = athlete['id']
        nome = athlete['nome_completo']
        numero_membro = athlete['numero_membro']
        old_url = athlete['url_foto']
        
        print(f"[{i}/{total}] {nome} (#{numero_membro})")
        
        # Verifica se a URL já é do Supabase (já migrada)
        if SUPABASE_URL in old_url:
            print(f"   ⏭️  Já migrada, pulando...")
            skipped += 1
            continue
        
        # Define caminho temporário
        temp_file = TEMP_DIR / f"atleta_{athlete_id}_temp"
        
        # 1. Baixa a imagem
        print(f"   ⬇️  Baixando de {old_url[:50]}...")
        if not download_image(old_url, temp_file):
            failed += 1
            continue
        
        # Detecta extensão
        file_ext = get_file_extension(old_url)
        
        # 2. Upload para Supabase
        print(f"   ⬆️  Fazendo upload para Supabase Storage...")
        new_url = upload_to_supabase(temp_file, athlete_id, file_ext)
        
        if not new_url:
            failed += 1
            temp_file.unlink(missing_ok=True)
            continue
        
        # 3. Atualiza banco de dados
        print(f"   💾 Atualizando banco de dados...")
        if update_athlete_photo_url(athlete_id, new_url):
            print(f"   ✅ Migrado com sucesso! Nova URL: {new_url[:60]}...")
            success += 1
        else:
            failed += 1
        
        # Remove arquivo temporário
        temp_file.unlink(missing_ok=True)
        
        # Pequena pausa para não sobrecarregar
        time.sleep(0.5)
        print()
    
    # Resumo final
    print("\n" + "="*60)
    print("📊 RESUMO DA MIGRAÇÃO")
    print("="*60)
    print(f"✅ Migradas com sucesso: {success}")
    print(f"⏭️  Já migradas (puladas): {skipped}")
    print(f"❌ Falhas: {failed}")
    print(f"📊 Total processado: {total}")
    print("="*60)
    
    # Limpa diretório temporário
    try:
        TEMP_DIR.rmdir()
    except:
        pass


if __name__ == "__main__":
    print("="*60)
    print("🥋 MIGRAÇÃO DE FOTOS DOS ATLETAS")
    print("="*60)
    print()
    
    try:
        migrate_photos()
    except KeyboardInterrupt:
        print("\n\n⚠️  Migração interrompida pelo usuário")
        print("Pode executar novamente para continuar de onde parou")
    except Exception as e:
        print(f"\n\n❌ Erro fatal: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n✨ Fim da execução")

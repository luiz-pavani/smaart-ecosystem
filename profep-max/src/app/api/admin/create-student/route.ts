import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Cliente admin com service_role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Função para gerar senha temporária
function gerarSenhaTemporaria(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let senha = '';
  for (let i = 0; i < 10; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
}

export async function POST(req: NextRequest) {
  try {
    const { full_name, email, cpf, phone, valor_mensal, plan } = await req.json();

    // Validações
    if (!full_name || !email) {
      return NextResponse.json(
        { error: 'Nome e email são obrigatórios' },
        { status: 400 }
      );
    }

    // Valida formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Gera senha temporária
    const senhaTemporaria = gerarSenhaTemporaria();

    // 1. Cria usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senhaTemporaria,
      email_confirm: true, // Auto-confirma o email
      user_metadata: {
        full_name
      }
    });

    if (authError) {
      console.error('Erro ao criar usuário:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      );
    }

    // 2. Cria perfil na tabela profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name,
        email,
        cpf: cpf || null,
        phone: phone || null,
        plan: plan || 'mensal',
        cond: 'ATIVO',
        created_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
      // Tenta remover o usuário do auth se falhar ao criar o perfil
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Erro ao criar perfil: ' + profileError.message },
        { status: 500 }
      );
    }

    // 3. Se tiver valor mensal customizado, salva em configuracoes ou metadata
    if (valor_mensal && parseFloat(valor_mensal) !== 49.90) {
      // Pode adicionar lógica aqui para salvar valor customizado
      // Por exemplo, criar uma tabela 'custom_pricing' ou usar metadata
    }

    // 4. Envia email de redefinição de senha
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.profepmax.com.br'}/auth/callback?next=/dashboard/perfil`
      }
    });

    if (resetError) {
      console.error('Erro ao enviar email de reset:', resetError);
      // Não falha aqui, pois o usuário já foi criado
    }

    return NextResponse.json({ 
      success: true,
      message: 'Aluno criado com sucesso',
      userId: authData.user.id,
      email: email
    });

  } catch (error: any) {
    console.error('Erro na API create-student:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

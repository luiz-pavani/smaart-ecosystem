import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Service role para garantir upsert no profiles (sem depender de RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type CheckoutRegisterResponse =
  | { session: any; user: any; needsEmailConfirmation?: boolean }
  | { session: null; user: any; needsSetPassword: boolean }
  | { error: string };

function generateTempPassword(length: number = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;
  try {
    const perPage = 1000;
    for (let page = 1; page <= 5; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) return null;
      const users = (data as any)?.users || [];
      const match = users.find((u: any) => String(u?.email || '').trim().toLowerCase() === normalized);
      if (match?.id) return String(match.id);
      if (!Array.isArray(users) || users.length < perPage) break;
    }
  } catch {
    // ignore
  }
  return null;
}

async function ensureProfileForAuthUser(params: {
  authUserId: string;
  email: string;
  fullName: string;
}) {
  const email = params.email.trim().toLowerCase();
  const fullName = params.fullName.trim();

  // Buscar perfil por email para tentar reconciliar id (caso tenha sido criado por webhook/fluxos antigos)
  const { data: profileByEmail } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, status, plan, plan_expires_at, subscription_status, id_subscription, belt_rank, created_at")
    .eq("email", email)
    .maybeSingle();

  // Se existir um perfil com esse email mas com id diferente, tenta mover para o auth uid
  if (profileByEmail?.id && profileByEmail.id !== params.authUserId) {
    const { error: idMoveError } = await supabaseAdmin
      .from("profiles")
      .update({
        id: params.authUserId,
        updated_at: new Date().toISOString(),
        full_name: fullName || profileByEmail.full_name,
        email,
      })
      .eq("id", profileByEmail.id);

    if (!idMoveError) {
      return;
    }

    // Se não conseguir mover o id (constraints/FKs), pelo menos atualiza o perfil existente.
    // Isso não resolve RLS se ela estiver baseada em auth.uid() = id, mas evita perder dados.
    await supabaseAdmin
      .from("profiles")
      .update({
        updated_at: new Date().toISOString(),
        full_name: fullName || profileByEmail.full_name,
      })
      .eq("id", profileByEmail.id);

    return;
  }

  // Caso padrão: upsert pelo auth uid
  await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        id: params.authUserId,
        email,
        full_name: fullName || profileByEmail?.full_name || "Usuário",
        role: "student",
        belt_rank: (profileByEmail as any)?.belt_rank || "Branca",
        status: profileByEmail?.status || "inactive",
        plan: profileByEmail?.plan || null,
        plan_expires_at: profileByEmail?.plan_expires_at || null,
        subscription_status: profileByEmail?.subscription_status || null,
        id_subscription: profileByEmail?.id_subscription || null,
        created_at: (profileByEmail as any)?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "id" }
    );
}

export async function POST(req: Request) {
  try {
    const { email, name, password } = await req.json();
    if (!email || !name) {
      return NextResponse.json({ error: "Dados obrigatórios ausentes." }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedName = String(name).trim();

    // Modo passwordless: cria (ou garante) usuário e envia link para definir senha.
    // Isso permite compra em uma ação sem pedir senha no checkout.
    if (!password || String(password).trim().length === 0) {
      // Se já existir usuário no Auth, apenas envia link de recuperação/definir senha.
      let userId = await findAuthUserIdByEmail(normalizedEmail);
      if (!userId) {
        const tempPassword = generateTempPassword();
        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: normalizedName },
        });

        // Se já existir (raro aqui), tenta buscar id e seguir.
        if (createError) {
          const msg = String(createError.message || '').toLowerCase();
          if (!msg.includes('already') && !msg.includes('registered')) {
            return NextResponse.json({ error: createError.message }, { status: 400 });
          }
          userId = await findAuthUserIdByEmail(normalizedEmail);
        } else {
          userId = created?.user?.id || null;
        }
      }

      if (userId) {
        await ensureProfileForAuthUser({ authUserId: userId, email: normalizedEmail, fullName: normalizedName });

        // Envia link para definir senha (recovery) direcionando para callback/login.
        await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: normalizedEmail,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.profepmax.com.br'}/auth/callback?next=/cursos`,
          },
        });

        const resp: CheckoutRegisterResponse = {
          session: null,
          user: { id: userId, email: normalizedEmail },
          needsSetPassword: true,
        };
        return NextResponse.json(resp, { status: 200 });
      }

      // Ainda permite seguir com a venda mesmo se não achou/gerou userId
      return NextResponse.json(
        { error: 'Não foi possível criar sua conta automaticamente. Tente novamente ou informe uma senha.' },
        { status: 400 }
      );
    }

    // Tenta criar usuário no auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { full_name: normalizedName }
      }
    });

    // Se já existe no auth, tenta login automático
    if (signUpError && signUpError.message && signUpError.message.toLowerCase().includes('user already registered')) {
      // Tenta login automático
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });
      if (loginError) {
        return NextResponse.json({ error: "Usuário já existe, mas a senha está incorreta. Tente fazer login manualmente." }, { status: 400 });
      }

      if (loginData?.user?.id) {
        await ensureProfileForAuthUser({
          authUserId: loginData.user.id,
          email: normalizedEmail,
          fullName: normalizedName,
        });
      }
      return NextResponse.json({ session: loginData.session, user: loginData.user });
    }

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    // Garante perfil com id = auth uid
    if (signUpData?.user?.id) {
      await ensureProfileForAuthUser({
        authUserId: signUpData.user.id,
        email: normalizedEmail,
        fullName: normalizedName,
      });
    }

    // Tenta login automático (pode falhar se exigir confirmação por e-mail)
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (loginError) {
      // Email confirmation em geral retorna erro aqui; não queremos bloquear o checkout.
      const maybeConfirmation = String(loginError.message || "").toLowerCase().includes("confirm") ||
        String(loginError.message || "").toLowerCase().includes("email") ||
        String(loginError.message || "").toLowerCase().includes("verified");

      const resp: CheckoutRegisterResponse = {
        session: null,
        user: signUpData.user,
        needsEmailConfirmation: maybeConfirmation,
      };
      return NextResponse.json(resp, { status: 200 });
    }

    return NextResponse.json({ session: loginData.session, user: loginData.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

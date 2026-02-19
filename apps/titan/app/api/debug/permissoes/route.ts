import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    // Step 1: Check cookies
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    const supabaseCookies = allCookies.filter(c => 
      c.name.includes('supabase') || c.name.includes('auth')
    )

    // Step 2: Create client
    const supabase = await createClient()

    // Step 3: Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    // Step 4: Get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ 
        step: 'auth.getUser',
        error: 'Não autorizado',
        user: null,
        userError: userError ? {
          message: userError.message,
          status: userError.status,
        } : null,
        session: session ? {
          userId: session.user.id,
          email: session.user.email,
          expiresAt: session.expires_at,
        } : null,
        sessionError: sessionError?.message,
        cookies: {
          total: allCookies.length,
          supabase: supabaseCookies.map(c => ({ name: c.name, hasValue: !!c.value })),
        }
      }, { status: 401 })
    }

    // Step 5: Try to get role
    const { data: perfilData, error: perfilError } = await supabase
      .from('user_roles')
      .select('role, federacao_id, academia_id')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({
      step: 'success',
      user: {
        id: user.id,
        email: user.email,
      },
      session: {
        expiresAt: session?.expires_at,
        isExpired: session ? new Date(session.expires_at * 1000) < new Date() : null,
      },
      query: {
        error: perfilError ? {
          message: perfilError.message,
          code: perfilError.code,
          details: perfilError.details,
          hint: perfilError.hint,
        } : null,
        data: perfilData,
      },
      status: perfilError ? 'ERROR' : (perfilData ? 'FOUND' : 'NOT_FOUND'),
      cookies: {
        total: allCookies.length,
        supabase: supabaseCookies.map(c => ({ name: c.name, hasValue: !!c.value })),
      }
    })
  } catch (error) {
    return NextResponse.json({
      step: 'exception',
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}

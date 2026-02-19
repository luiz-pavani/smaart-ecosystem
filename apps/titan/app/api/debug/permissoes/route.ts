import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ 
        error: 'Não autorizado',
        user: null 
      }, { status: 401 })
    }

    // Try to get role
    const { data: perfilData, error: perfilError } = await supabase
      .from('user_roles')
      .select('role, federacao_id, academia_id')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      query: {
        error: perfilError ? {
          message: perfilError.message,
          code: perfilError.code,
          details: perfilError.details,
        } : null,
        data: perfilData,
      },
      status: perfilError ? 'ERROR' : (perfilData ? 'FOUND' : 'NOT_FOUND'),
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      return NextResponse.json(
        { error: 'Supabase credentials missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(url, key)

    // Try to sign up/create the user with auth
    console.log(`🔧 Setting master_access for ${email}`)
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      // If user already exists, get user and update password
      if (authError.message?.includes('already exists')) {
        console.log(`⚠️ User ${email} already exists, updating password`)
        
        // Look up the existing user by email
        const { data: users } = await supabase.auth.admin.listUsers()
        const existingUser = users?.users?.find(u => u.email === email)
        
        if (existingUser) {
          const { error: pwError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            { password }
          )
          
          if (pwError) {
            console.error('❌ Password update error:', pwError)
          } else {
            console.log(`✅ Password updated for ${email}`)
          }
        }
      } else {
        console.error('❌ Auth error:', authError)
        return NextResponse.json(
          { error: authError.message },
          { status: 400 }
        )
      }
    } else {
      console.log(`✅ User ${email} created successfully`)
    }

    // Get the user ID
    let userId = authData?.user?.id
    
    if (!userId) {
      const { data: users } = await supabase.auth.admin.listUsers()
      const user = users?.users?.find(u => u.email === email)
      userId = user?.id
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Could not get user ID' },
        { status: 400 }
      )
    }

    // Atribuir role master_access diretamente em stakeholders
    const { error: delError } = await supabase
      .from('stakeholders')
      .update({ role: 'atleta' })
      .eq('id', userId)

    if (delError) {
      console.log('⚠️ Could not reset role:', delError.message)
    }

    // Atualizar para master_access
    const { data: roleData, error: roleError } = await supabase
      .from('stakeholders')
      .update({
        role: 'master_access',
        federacao_id: null,
        academia_id: null,
      })
      .eq('id', userId)
      .select()

    if (roleError) {
      console.error('❌ Role assignment error:', roleError)
      return NextResponse.json(
        { error: `Could not assign role: ${roleError.message}` },
        { status: 400 }
      )
    }

    console.log(`✅ Master access assigned to ${email}`)

    return NextResponse.json(
      {
        success: true,
        message: `Master access assigned to ${email}`,
        userId,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

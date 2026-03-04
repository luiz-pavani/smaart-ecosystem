import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const debug = {
    env: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ SET' : '❌ MISSING',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ SET' : '❌ MISSING',
    },
    timestamp: new Date().toISOString(),
    errors: [] as string[],
    data: null as any,
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url) {
      debug.errors.push('NEXT_PUBLIC_SUPABASE_URL is missing')
      return NextResponse.json(debug, { status: 500 })
    }

    if (!serviceKey) {
      debug.errors.push('SUPABASE_SERVICE_KEY is missing')
      return NextResponse.json(debug, { status: 500 })
    }

    debug.env.url = '✅ SET (URL: ' + url.substring(0, 20) + '...)'
    debug.env.serviceKey = '✅ SET (Key: ' + serviceKey.substring(0, 10) + '...)'

    const supabase = createClient(url, serviceKey)

    // Test 1: Simple count
    console.log('Testing simple count...')
    const { count, error: countError } = await supabase
      .from('academias')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      debug.errors.push(`Count query failed: ${countError.message}`)
    } else {
      debug.data = { count }
    }

    // Test 2: Get first 5 academias
    console.log('Testing select all...')
    const { data, error: selectError } = await supabase
      .from('academias')
      .select('*')
      .limit(5)

    if (selectError) {
      debug.errors.push(`Select query failed: ${selectError.message}`)
      debug.errors.push(`Error code: ${selectError.code}`)
      debug.errors.push(`Error details: ${selectError.details}`)
    } else {
      debug.data = {
        ...debug.data,
        sampleCount: data?.length || 0,
        sampleData: data?.slice(0, 2), // Just first 2 for readability
      }
    }

    if (debug.errors.length === 0) {
      debug.errors.push('All tests passed!')
    }

    return NextResponse.json(debug, { status: 200 })
  } catch (error) {
    debug.errors.push(`Catch error: ${error instanceof Error ? error.message : String(error)}`)
    return NextResponse.json(debug, { status: 500 })
  }
}

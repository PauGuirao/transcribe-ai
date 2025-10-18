import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Compute weak ETag from latest updated_at for this user's profiles
  const { data: latest, error: latestErr } = await supabase
    .from('alumne')
    .select('updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const latestUpdatedAt = latest?.updated_at || '0'
  const weakEtag = `W/"alumne-${user.id}-${latestUpdatedAt}"`

  const ifNoneMatch = request.headers.get('if-none-match')
  if (ifNoneMatch && ifNoneMatch === weakEtag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: weakEtag,
        'Cache-Control': 'private, max-age=15',
      },
    })
  }

  const { data, error } = await supabase
    .from('alumne')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching alumne records', error)
    return NextResponse.json({ error: 'Unable to fetch profiles' }, { status: 500 })
  }

  return NextResponse.json({ profiles: data ?? [] }, {
    headers: {
      ETag: weakEtag,
      'Cache-Control': 'private, max-age=15',
    },
  })
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const name: string | undefined = body?.name
  const age: number | undefined = body?.age

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  }

  if (typeof age !== 'number' || Number.isNaN(age) || age < 0 || age > 25) {
    return NextResponse.json({ error: 'Edad inválida (0-25)' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('alumne')
    .insert({
      user_id: user.id,
      name: name.trim(),
      age,
    })
    .select('*')
    .single()

  if (error) {
    console.error('Error creating alumne record', error)
    return NextResponse.json({ error: 'No se pudo crear el perfil' }, { status: 500 })
  }

  return NextResponse.json({ profile: data }, { status: 201 })
}

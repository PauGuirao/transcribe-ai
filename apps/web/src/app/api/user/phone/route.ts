import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * E.164 phone validator: leading "+", country code (1-3 digits), then 4-14
 * national digits. Total length 8-16 characters.
 */
const E164 = /^\+\d{7,15}$/;

function normalize(raw: string): string {
  // Keep "+" if present, strip everything that isn't a digit.
  const hasPlus = raw.trim().startsWith('+');
  const digits = raw.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits ? `+${digits}` : '';
}

async function getClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    },
  );
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawPhone: unknown = body?.phone;

    // Allow clearing the phone by sending an empty string or null.
    if (rawPhone === null || rawPhone === '') {
      const { error } = await supabase
        .from('profiles')
        .update({ phone: null, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) {
        console.error('clear phone failed:', error);
        return NextResponse.json({ success: false, error: 'Failed to clear phone' }, { status: 500 });
      }
      return NextResponse.json({ success: true, phone: null });
    }

    if (typeof rawPhone !== 'string') {
      return NextResponse.json({ success: false, error: 'Phone must be a string' }, { status: 400 });
    }

    const phone = normalize(rawPhone);
    if (!E164.test(phone)) {
      return NextResponse.json(
        { success: false, error: 'Phone must be in international E.164 format (e.g. +34612345678)' },
        { status: 400 },
      );
    }

    // Uniqueness check: another profile cannot already own this phone.
    const { data: existing, error: existingErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .neq('id', user.id)
      .limit(1)
      .maybeSingle();
    if (existingErr) {
      console.error('phone uniqueness lookup failed:', existingErr);
      return NextResponse.json({ success: false, error: 'Failed to validate phone' }, { status: 500 });
    }
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'This phone number is already linked to another account.' },
        { status: 409 },
      );
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ phone, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (updateError) {
      // Unique violation race
      if ((updateError as any)?.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'This phone number is already linked to another account.' },
          { status: 409 },
        );
      }
      console.error('update phone failed:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to update phone' }, { status: 500 });
    }

    return NextResponse.json({ success: true, phone });
  } catch (error) {
    console.error('Error updating phone:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await getClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });

    const { data, error } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .single();
    if (error) {
      console.error('phone GET failed:', error);
      return NextResponse.json({ success: false, error: 'Failed to load phone' }, { status: 500 });
    }
    return NextResponse.json({ success: true, phone: data?.phone ?? null });
  } catch (error) {
    console.error('Error loading phone:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

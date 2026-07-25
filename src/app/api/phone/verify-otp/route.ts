// src/app/api/phone/verify-otp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const jwt = authHeader.slice(7);

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const code = String(body.code || '').trim();
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Enter the 6-digit code' }, { status: 400 });
    }

    const { data: rows, error: fetchError } = await supabaseAdmin
      .from('phone_otps')
      .select('*')
      .eq('user_id', userId)
      .eq('consumed', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError || !rows?.length) {
      return NextResponse.json({ error: 'No active code. Request a new one.' }, { status: 400 });
    }

    const otp = rows[0];
    if (new Date(otp.expires_at) < new Date()) {
      await supabaseAdmin.from('phone_otps').update({ consumed: true }).eq('id', otp.id);
      return NextResponse.json({ error: 'Code expired. Request a new one.' }, { status: 400 });
    }

    if (otp.attempts >= 5) {
      await supabaseAdmin.from('phone_otps').update({ consumed: true }).eq('id', otp.id);
      return NextResponse.json({ error: 'Too many attempts. Request a new code.' }, { status: 400 });
    }

    if (otp.code_hash !== hashCode(code)) {
      await supabaseAdmin
        .from('phone_otps')
        .update({ attempts: otp.attempts + 1 })
        .eq('id', otp.id);
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    // Success
    await supabaseAdmin.from('phone_otps').update({ consumed: true }).eq('id', otp.id);

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        phone_verified_at: new Date().toISOString(),
        phone: otp.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      // Still return success if OTP was valid; column may be missing
    }

    return NextResponse.json({ success: true, phone: otp.phone });
  } catch (e) {
    console.error('verify-otp error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

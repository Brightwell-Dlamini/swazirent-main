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

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, 401);
    }
    const jwt = authHeader.slice(7);

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !userData.user) {
      return json({ error: 'Unauthorized', code: 'AUTH_INVALID' }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json();
    const code = String(body.code || '').trim();
    if (!/^\d{6}$/.test(code)) {
      return json({ error: 'Enter the 6-digit code', code: 'CODE_FORMAT' }, 400);
    }

    const { data: rows, error: fetchError } = await supabaseAdmin
      .from('phone_otps')
      .select('*')
      .eq('user_id', userId)
      .eq('consumed', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError || !rows?.length) {
      return json({ error: 'No active code. Request a new one.', code: 'NO_ACTIVE_CODE' }, 400);
    }

    const otp = rows[0];
    if (new Date(otp.expires_at) < new Date()) {
      await supabaseAdmin.from('phone_otps').update({ consumed: true }).eq('id', otp.id);
      return json({ error: 'Code expired. Request a new one.', code: 'CODE_EXPIRED' }, 400);
    }

    if (otp.attempts >= 5) {
      await supabaseAdmin.from('phone_otps').update({ consumed: true }).eq('id', otp.id);
      return json({ error: 'Too many attempts. Request a new code.', code: 'TOO_MANY_ATTEMPTS' }, 400);
    }

    if (otp.code_hash !== hashCode(code)) {
      await supabaseAdmin
        .from('phone_otps')
        .update({ attempts: (otp.attempts || 0) + 1 })
        .eq('id', otp.id);
      return json({ error: 'Invalid code', code: 'CODE_INVALID' }, 400);
    }

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
    }

    return json({ success: true, code: 'PHONE_VERIFIED', phone: otp.phone }, 200);
  } catch (e) {
    console.error('verify-otp error:', e);
    return json({ error: 'Internal error', code: 'INTERNAL' }, 500);
  }
}

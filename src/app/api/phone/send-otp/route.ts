// src/app/api/phone/send-otp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomInt } from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('268') && digits.length === 11) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 9) return `+268${digits.slice(1)}`;
  if (digits.length === 8) return `+268${digits}`;
  if (phone.startsWith('+')) return phone.replace(/\s/g, '');
  return `+${digits}`;
}

function twilioConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
}

async function sendSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  if (!twilioConfigured()) {
    console.log(`[DEV OTP SMS] to=${to} body=${body}`);
    return { ok: true };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_PHONE_NUMBER!;

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      console.error('Twilio error:', err);
      return { ok: false, error: 'Failed to send SMS' };
    }
    return { ok: true };
  } catch (e) {
    console.error('SMS send error:', e);
    return { ok: false, error: 'Failed to send SMS' };
  }
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
    const phone = normalizePhone(body.phone || '');
    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: 'Valid Eswatini phone required' }, { status: 400 });
    }

    // Rate limit: max 5 OTPs in 15 minutes
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from('phone_otps')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since);

    if ((count || 0) >= 5) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait 15 minutes.' },
        { status: 429 }
      );
    }

    const code = String(randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Invalidate previous unused codes
    await supabaseAdmin
      .from('phone_otps')
      .update({ consumed: true })
      .eq('user_id', userId)
      .eq('consumed', false);

    const { error: insertError } = await supabaseAdmin.from('phone_otps').insert({
      user_id: userId,
      phone,
      code_hash: hashCode(code),
      expires_at: expiresAt,
      attempts: 0,
      consumed: false,
    });

    if (insertError) {
      console.error('OTP insert error:', insertError);
      return NextResponse.json(
        { error: `OTP service error: ${insertError.message}` },
        { status: 503 }
      );
    }

    const sms = await sendSms(
      phone,
      `Your Ekhaya verification code is ${code}. Valid for 10 minutes.`
    );

    if (!sms.ok) {
      return NextResponse.json({ error: sms.error || 'Failed to send SMS' }, { status: 502 });
    }

    /**
     * DB only stores code_hash (never the plain code) — that is intentional.
     * When Twilio is not configured, return the code in the API response
     * so the UI can show it. Works on Vercel preview/prod without SMS.
     * Force-hide with PHONE_OTP_HIDE_DEV_CODE=true if needed.
     */
    const exposeDevCode =
      !twilioConfigured() && process.env.PHONE_OTP_HIDE_DEV_CODE !== 'true';

    return NextResponse.json({
      success: true,
      message: exposeDevCode
        ? 'Dev mode — enter the code shown below (no SMS configured)'
        : 'Code sent by SMS',
      ...(exposeDevCode ? { devCode: code } : {}),
    });
  } catch (e) {
    console.error('send-otp error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

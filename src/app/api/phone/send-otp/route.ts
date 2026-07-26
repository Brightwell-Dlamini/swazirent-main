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

function json(
  body: Record<string, unknown>,
  status: number,
  extraHeaders?: Record<string, string>
) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
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
    const phone = normalizePhone(body.phone || '');
    if (!phone || phone.length < 10) {
      return json({ error: 'Valid Eswatini phone required', code: 'PHONE_INVALID' }, 400);
    }

    const windowMs = 15 * 60 * 1000;
    const maxAttempts = 5;
    const since = new Date(Date.now() - windowMs).toISOString();
    const { count } = await supabaseAdmin
      .from('phone_otps')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since);

    const used = count || 0;
    const remaining = Math.max(0, maxAttempts - used);
    const rateHeaders = {
      'X-RateLimit-Limit': String(maxAttempts),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Window': '900',
    };

    if (used >= maxAttempts) {
      return json(
        {
          error: 'Too many attempts. Please wait 15 minutes.',
          code: 'RATE_LIMITED',
          retryAfterSeconds: 900,
        },
        429,
        { ...rateHeaders, 'Retry-After': '900' }
      );
    }

    const code = String(randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

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
      return json(
        { error: `OTP service error: ${insertError.message}`, code: 'OTP_STORE_FAILED' },
        503
      );
    }

    const sms = await sendSms(
      phone,
      `Your Ekhaya verification code is ${code}. Valid for 10 minutes.`
    );

    if (!sms.ok) {
      return json({ error: sms.error || 'Failed to send SMS', code: 'SMS_FAILED' }, 502);
    }

    const exposeDevCode =
      !twilioConfigured() && process.env.PHONE_OTP_HIDE_DEV_CODE !== 'true';

    return json(
      {
        success: true,
        code: 'OTP_SENT',
        message: exposeDevCode
          ? 'Dev mode — enter the code shown below (no SMS configured)'
          : 'Code sent by SMS',
        ...(exposeDevCode ? { devCode: code } : {}),
      },
      200,
      {
        ...rateHeaders,
        'X-RateLimit-Remaining': String(Math.max(0, remaining - 1)),
      }
    );
  } catch (e) {
    console.error('send-otp error:', e);
    return json({ error: 'Internal error', code: 'INTERNAL' }, 500);
  }
}

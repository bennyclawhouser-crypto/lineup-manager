import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text) return new Response('missing text', { status: 400 });

    const msg = `💬 *Feedback — Lineup Manager*\n\n${text}`;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: msg, parse_mode: 'Markdown' }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(String(e), { status: 500, headers: corsHeaders });
  }
});

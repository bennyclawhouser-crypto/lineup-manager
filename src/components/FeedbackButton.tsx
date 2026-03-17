import { useState } from 'react';

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      // Send via Telegram Bot API — bot token + chat id injected at build time
      const token = import.meta.env.VITE_TG_BOT_TOKEN;
      const chatId = import.meta.env.VITE_TG_CHAT_ID;
      if (token && chatId) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `📋 *Feedback från Lineup Manager*\n\n${text}`,
            parse_mode: 'Markdown',
          }),
        });
      }
      setSent(true);
      setText('');
      setTimeout(() => { setSent(false); setOpen(false); }, 2000);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        title="Skicka feedback"
        style={{
          position: 'fixed', bottom: 76, right: 16, zIndex: 40,
          width: 44, height: 44, borderRadius: '50%',
          background: '#fff', border: '1px solid #dadce0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          cursor: 'pointer', fontSize: 20, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
        💬
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 200, padding: '0 0 80px',
        }} onClick={() => setOpen(false)}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 20,
            width: '100%', maxWidth: 480, margin: '0 16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 500, fontSize: 16, color: '#202124', marginBottom: 4 }}>💬 Feedback</div>
            <div style={{ fontSize: 13, color: '#5f6368', marginBottom: 12 }}>Dina synpunkter skickas direkt till utvecklaren.</div>

            {sent ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#43A047', fontWeight: 500 }}>
                ✅ Tack! Feedbacken är skickad.
              </div>
            ) : (
              <>
                <textarea
                  style={{
                    width: '100%', minHeight: 100, padding: '10px 12px',
                    border: '1px solid #dadce0', borderRadius: 6, fontSize: 14,
                    resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
                    outline: 'none', color: '#202124',
                  }}
                  placeholder="Vad fungerar bra? Vad kan bli bättre?"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  autoFocus
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#5f6368', cursor: 'pointer', fontWeight: 500, fontSize: 14, padding: '8px 12px' }}>
                    Avbryt
                  </button>
                  <button onClick={send} disabled={!text.trim() || sending} style={{
                    background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4,
                    padding: '8px 20px', cursor: 'pointer', fontWeight: 500, fontSize: 14,
                    opacity: !text.trim() || sending ? 0.5 : 1,
                  }}>
                    {sending ? 'Skickar...' : 'Skicka'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

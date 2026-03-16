import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    setError('');
    const { error } = await supabase.from('feedback').insert({ message: text.trim() });
    if (error) {
      setError('Kunde inte skicka. Försök igen.');
    } else {
      setSent(true);
      setText('');
      setTimeout(() => { setSent(false); setOpen(false); }, 2200);
    }
    setSending(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Ge feedback"
        aria-label="Feedback"
        style={{
          position: 'fixed', bottom: 76, right: 14, zIndex: 200,
          width: 38, height: 38, borderRadius: '50%',
          background: '#fff', border: '1px solid #dadce0',
          boxShadow: '0 1px 6px rgba(0,0,0,0.18)',
          cursor: 'pointer', fontSize: 17,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        💬
      </button>

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 300, padding: '0 0 72px' }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: 12, padding: '20px 18px', width: '94%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 10px', fontWeight: 500, fontSize: 16, color: '#202124' }}>💬 Feedback</h3>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#43A047', fontWeight: 500, fontSize: 15 }}>
                ✓ Tack för din feedback!
              </div>
            ) : (
              <>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Vad fungerar bra? Vad kan förbättras?"
                  autoFocus
                  style={{ width: '100%', minHeight: 90, padding: '10px 12px', border: '1px solid #dadce0', borderRadius: 6, fontSize: 14, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#202124', outline: 'none' }}
                />
                {error && <p style={{ color: '#E53935', fontSize: 12, margin: '6px 0 0' }}>{error}</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button onClick={() => setOpen(false)} style={textBtn}>Avbryt</button>
                  <button onClick={send} disabled={!text.trim() || sending}
                    style={{ ...primaryBtn, opacity: !text.trim() || sending ? 0.6 : 1 }}>
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

const primaryBtn: React.CSSProperties = { background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 20px', cursor: 'pointer', fontWeight: 500, fontSize: 14 };
const textBtn: React.CSSProperties = { background: 'none', color: '#5f6368', border: 'none', padding: '8px 12px', cursor: 'pointer', fontWeight: 500, fontSize: 14 };

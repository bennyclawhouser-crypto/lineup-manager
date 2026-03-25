import { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from('feedback').insert({
        text: text.trim(),
        user_email: (await supabase.auth.getUser()).data.user?.email ?? null,
      });
      if (!error) { setSent(true); setText(''); setTimeout(() => { setSent(false); setOpen(false); }, 2000); }
    } finally { setSending(false); }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        position: 'fixed', bottom: 80, right: 16, zIndex: 40,
        width: 44, height: 44, borderRadius: '50%',
        background: '#fff', border: 'none',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <MessageSquare size={20} color="#6B7280" />
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setOpen(false)}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#1A1A1A' }}>Feedback</div>
                <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>Skickas direkt till utvecklaren</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: '#F3F4F6', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={16} color="#6B7280" />
              </button>
            </div>

            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#22C55E', fontWeight: 600 }}>
                Tack! Feedback skickad.
              </div>
            ) : (
              <>
                <textarea
                  style={{ width: '100%', minHeight: 100, padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, resize: 'vertical', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box', color: '#1A1A1A' }}
                  placeholder="Vad fungerar bra? Vad kan bli bättre?"
                  value={text} onChange={e => setText(e.target.value)} autoFocus
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button onClick={() => setOpen(false)} style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '8px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#1A1A1A' }}>Avbryt</button>
                  <button onClick={send} disabled={!text.trim() || sending}
                    style={{ background: text.trim() ? '#C8E64C' : '#F3F4F6', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default', color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Send size={14} color="#1A1A1A" />
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

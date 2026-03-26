import { useState } from 'react';
import { Send } from 'lucide-react';
import { useMatchComments } from '../hooks/useMatchComments';

interface Props {
  matchId: string;
  userEmail: string;
}

function initials(email: string): string {
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/);
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Deterministic color per email
function avatarColor(email: string): string {
  const colors = ['#C8E64C', '#6366F1', '#F59E0B', '#22C55E', '#EF4444', '#8B5CF6'];
  let hash = 0;
  for (const c of email) hash = (hash * 31 + c.charCodeAt(0)) % colors.length;
  return colors[Math.abs(hash)];
}

export default function MatchComments({ matchId, userEmail }: Props) {
  const { comments, addComment } = useMatchComments(matchId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const send = async () => {
    if (!text.trim()) return;
    setSending(true); setSendError('');
    try {
      const ok = await addComment(text, userEmail);
      if (ok) { setText(''); }
      else { setSendError('Kunde inte spara. Försök igen.'); }
    } catch { setSendError('Något gick fel.'); }
    finally { setSending(false); }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginTop: 16 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', fontWeight: 700, fontSize: 16, color: '#1A1A1A' }}>
        Chatt
      </div>

      <div style={{ maxHeight: 280, overflowY: 'auto', padding: '8px 0' }}>
        {comments.length === 0 && (
          <div style={{ padding: '20px', color: '#9CA3AF', fontSize: 14, textAlign: 'center' }}>
            Inga anteckningar ännu
          </div>
        )}
        {comments.map(c => (
          <div key={c.id} style={{ padding: '12px 20px', display: 'flex', gap: 12, alignItems: 'flex-start', borderTop: '1px solid #F3F4F6' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(c.user_email), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#1A1A1A', flexShrink: 0 }}>
              {initials(c.user_email)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{c.user_email.split('@')[0]}</span>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>{formatTime(c.created_at)}</span>
              </div>
              <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Skriv en anteckning..."
          rows={2}
          style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, resize: 'none', fontFamily: 'Inter, sans-serif', outline: 'none', color: '#1A1A1A' }}
        />
        <button onClick={send} disabled={!text.trim() || sending}
          style={{ width: 40, height: 40, borderRadius: 10, background: text.trim() && !sending ? '#C8E64C' : '#F3F4F6', border: 'none', cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 150ms ease-out' }}>
          <Send size={16} color={text.trim() && !sending ? '#1A1A1A' : '#9CA3AF'} />
        </button>
      </div>
      {sendError && <div style={{ padding: '8px 16px 12px', color: '#EF4444', fontSize: 13 }}>{sendError}</div>}
    </div>
  );
}

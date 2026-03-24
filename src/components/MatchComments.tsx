import { useState } from 'react';
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

export default function MatchComments({ matchId, userEmail }: Props) {
  const { comments, addComment } = useMatchComments(matchId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    const ok = await addComment(text, userEmail);
    if (ok) setText('');
    setSending(false);
  };

  return (
    <div style={{ marginTop: 24, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f3f4', fontWeight: 500, color: '#202124', fontSize: 15 }}>
        💬 Anteckningar
      </div>

      {/* Comments list */}
      <div style={{ maxHeight: 260, overflowY: 'auto', padding: '8px 0' }}>
        {comments.length === 0 && (
          <div style={{ padding: '16px', color: '#9e9e9e', fontSize: 14, textAlign: 'center' }}>
            Inga anteckningar ännu
          </div>
        )}
        {comments.map(c => (
          <div key={c.id} style={{ padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#1a73e8',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>
              {initials(c.user_email)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#202124' }}>
                  {c.user_email.split('@')[0]}
                </span>
                <span style={{ fontSize: 11, color: '#9e9e9e' }}>{formatTime(c.created_at)}</span>
              </div>
              <div style={{ fontSize: 14, color: '#202124', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {c.text}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f3f4', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Skriv en anteckning... (Enter för att skicka)"
          rows={2}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 6,
            border: '1px solid #dadce0', fontSize: 14,
            resize: 'none', fontFamily: 'inherit', outline: 'none',
          }}
        />
        <button onClick={send} disabled={!text.trim() || sending} style={{
          background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 20,
          padding: '8px 16px', cursor: 'pointer', fontWeight: 500, fontSize: 14,
          opacity: !text.trim() || sending ? 0.5 : 1, flexShrink: 0,
        }}>
          Skicka
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function AuthPage() {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(''); setInfo(''); setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signInWithEmail(email, password);
        if (error) setError(error.message);
      } else {
        const { error } = await signUpWithEmail(email, password);
        if (error) setError(error.message);
        else setInfo('Kolla din e-post för bekräftelselänk!');
      }
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#f8f9fa',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Google Sans', Roboto, system-ui, sans-serif",
      padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 8, padding: '40px 36px',
        width: '100%', maxWidth: 400,
        boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>⚽</div>
        <h1 style={{ fontSize: 24, fontWeight: 500, color: '#202124', marginBottom: 4 }}>Lineup Manager</h1>
        <p style={{ fontSize: 14, color: '#5f6368', marginBottom: 32 }}>
          {mode === 'login' ? 'Logga in för att fortsätta' : 'Skapa tränarkonto'}
        </p>

        <input
          style={inputStyle} type="email" placeholder="E-postadress"
          value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          autoFocus
        />
        <input
          style={{ ...inputStyle, marginTop: 12 }} type="password" placeholder="Lösenord"
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />

        {error && <p style={{ color: '#E53935', fontSize: 13, marginTop: 8, textAlign: 'left' }}>{error}</p>}
        {info && <p style={{ color: '#43A047', fontSize: 13, marginTop: 8, textAlign: 'left' }}>{info}</p>}

        <button onClick={submit} disabled={loading || !email || !password}
          style={{
            width: '100%', marginTop: 24, padding: '12px',
            background: '#1a73e8', color: '#fff', border: 'none',
            borderRadius: 4, fontSize: 15, fontWeight: 500, cursor: 'pointer',
            opacity: loading || !email || !password ? 0.6 : 1,
          }}>
          {loading ? '...' : mode === 'login' ? 'Logga in' : 'Skapa konto'}
        </button>

        <div style={{ marginTop: 20, fontSize: 14, color: '#5f6368' }}>
          {mode === 'login' ? (
            <>Ny tränare? <button style={linkBtn} onClick={() => setMode('signup')}>Skapa konto</button></>
          ) : (
            <>Har du konto? <button style={linkBtn} onClick={() => setMode('login')}>Logga in</button></>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 4,
  border: '1px solid #dadce0', fontSize: 15, boxSizing: 'border-box',
  color: '#202124', outline: 'none', textAlign: 'left',
};
const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: '#1a73e8',
  cursor: 'pointer', fontSize: 14, fontWeight: 500, padding: 0,
};

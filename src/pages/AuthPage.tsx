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
      minHeight: '100vh', background: '#D9EC6E',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, padding: '40px 32px',
        width: '100%', maxWidth: 380,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <img src="/lineup-manager/logo.png" alt="Lineup Manager" style={{ height: 48, objectFit: 'contain', margin: '0 auto 20px', display: 'block' }} />

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', marginBottom: 6 }}>Lineup Manager</h1>
        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 28 }}>
          {mode === 'login' ? 'Logga in för att fortsätta' : 'Skapa tränarkonto'}
        </p>

        <input
          style={inputStyle} type="email" placeholder="E-postadress"
          value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          autoFocus
        />
        <input
          style={{ ...inputStyle, marginTop: 10 }} type="password" placeholder="Lösenord"
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />

        {error && <p style={{ color: '#EF4444', fontSize: 13, marginTop: 8, textAlign: 'left' }}>{error}</p>}
        {info && <p style={{ color: '#22C55E', fontSize: 13, marginTop: 8, textAlign: 'left' }}>{info}</p>}

        <button onClick={submit} disabled={loading || !email || !password}
          style={{
            width: '100%', marginTop: 20, padding: '12px',
            background: '#C8E64C', color: '#1A1A1A', border: 'none',
            borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
            opacity: loading || !email || !password ? 0.5 : 1,
            transition: 'background 150ms ease-out',
          }}>
          {loading ? '...' : mode === 'login' ? 'Logga in' : 'Skapa konto'}
        </button>

        <div style={{ marginTop: 20, fontSize: 14, color: '#6B7280' }}>
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
  width: '100%', padding: '12px 14px', borderRadius: 10,
  border: '1.5px solid #E5E7EB', fontSize: 14, boxSizing: 'border-box',
  color: '#1A1A1A', outline: 'none', background: '#fff', textAlign: 'left',
  transition: 'border-color 150ms ease-out',
};
const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: '#1A1A1A',
  cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0,
  textDecoration: 'underline',
};

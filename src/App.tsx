import { useState } from 'react';
import PlayersPage from './pages/PlayersPage';
import MatchesPage from './pages/MatchesPage';
import MatchPlanPage from './pages/MatchPlanPage';
import AuthPage from './pages/AuthPage';
import FeedbackButton from './components/FeedbackButton';
import { useAuth } from './hooks/useAuth';
import { useTeamData } from './hooks/useTeamData';
import type { Match } from './types';

type Tab = 'matches' | 'players';

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { players, matches, loading: dataLoading, upsertPlayer, deletePlayer, createMatch, updateMatchPlayers } = useTeamData();
  const [tab, setTab] = useState<Tab>('matches');
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);

  if (authLoading) return <Splash />;
  if (!user) return <AuthPage />;

  const handleCreateMatch = async (m: Match) => {
    await createMatch(m);
    setActiveMatch(m);
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'matches', label: 'Matcher', icon: '⚽' },
    { id: 'players', label: 'Truppen', icon: '👥' },
  ];

  if (activeMatch) {
    return (
      <Shell>
        <TopBar title={activeMatch.opponent || 'Match'} onBack={() => setActiveMatch(null)} />
        <MatchPlanPage match={activeMatch} players={players} onBack={() => setActiveMatch(null)} onUpdateMatchPlayers={updateMatchPlayers} />
      </Shell>
    );
  }

  return (
    <Shell>
      <TopBar title="Lineup Manager" userEmail={user.email} onSignOut={signOut} />
      <FeedbackButton />
      <div style={{ paddingBottom: 72 }}>
        {tab === 'matches' && (
          <MatchesPage
            matches={matches} players={players}
            onCreateMatch={handleCreateMatch}
            onSelectMatch={setActiveMatch}
            onUpsertPlayer={upsertPlayer}
            loading={dataLoading}
          />
        )}
        {tab === 'players' && (
          <PlayersPage
            players={players}
            onUpsert={upsertPlayer}
            onDelete={deletePlayer}
          />
        )}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #e0e0e0',
        display: 'flex', height: 64,
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 2, border: 'none', background: 'none',
            cursor: 'pointer', padding: 0,
            color: tab === t.id ? '#1a73e8' : '#5f6368',
          }}>
            <div style={{
              width: 64, height: 32, borderRadius: 16,
              background: tab === t.id ? '#e8f0fe' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>
              {t.icon}
            </div>
            <span style={{ fontSize: 12, fontWeight: tab === t.id ? 600 : 400 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: "'Google Sans', Roboto, system-ui, sans-serif" }}>
      {children}
    </div>
  );
}

function TopBar({ title, onBack, userEmail, onSignOut }: {
  title: string; onBack?: () => void; userEmail?: string; onSignOut?: () => void;
}) {
  return (
    <div style={{
      background: '#fff', borderBottom: '1px solid #e0e0e0',
      padding: '0 16px', height: 56,
      display: 'flex', alignItems: 'center', gap: 12,
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      {onBack ? (
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#5f6368', borderRadius: '50%', display: 'flex' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z"/>
          </svg>
        </button>
      ) : (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>⚽</div>
      )}
      <span style={{ fontWeight: 500, fontSize: 18, color: '#202124', flex: 1 }}>{title}</span>
      {userEmail && onSignOut && (
        <button onClick={onSignOut} style={{ background: 'none', border: '1px solid #dadce0', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontSize: 12, color: '#5f6368', fontWeight: 500 }}>
          Logga ut
        </button>
      )}
    </div>
  );
}

function Splash() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', fontFamily: 'system-ui' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56 }}>⚽</div>
        <div style={{ marginTop: 16, color: '#5f6368', fontSize: 15 }}>Laddar...</div>
      </div>
    </div>
  );
}

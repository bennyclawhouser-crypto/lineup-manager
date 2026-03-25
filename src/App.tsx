import { useState } from 'react';
import { Users, Calendar, LogOut, ChevronRight } from 'lucide-react';
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
  const { players, matches, upsertPlayer, deletePlayer, createMatch, deleteMatch, updateMatchPlayers } = useTeamData();
  const [tab, setTab] = useState<Tab>('matches');
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);

  if (authLoading) return <Splash />;
  if (!user) return <AuthPage />;

  const handleCreateMatch = async (m: Match) => {
    await createMatch(m);
    setActiveMatch(m);
  };

  if (activeMatch) {
    return (
      <div style={{ minHeight: '100vh', background: '#D9EC6E', fontFamily: 'Inter, sans-serif' }}>
        <TopBar
          title={activeMatch.opponent || 'Match'}
          showBack
          onBack={() => setActiveMatch(null)}
        />
        <div style={{ padding: '0 16px 24px', maxWidth: 680, margin: '0 auto' }}>
          <MatchPlanPage
            match={activeMatch}
            players={players}
            onBack={() => setActiveMatch(null)}
            onUpdateMatchPlayers={updateMatchPlayers}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#D9EC6E', fontFamily: 'Inter, sans-serif' }}>
      <TopBar title="Lineup Manager" userEmail={user.email} onSignOut={signOut} />

      <div style={{ padding: '0 16px 88px', maxWidth: 680, margin: '0 auto' }}>
        {tab === 'matches' && (
          <MatchesPage
            matches={matches}
            players={players}
            onCreateMatch={handleCreateMatch}
            onSelectMatch={setActiveMatch}
            onUpsertPlayer={upsertPlayer}
            onDeleteMatch={deleteMatch}
          />
        )}
        {tab === 'players' && (
          <PlayersPage players={players} onUpsert={upsertPlayer} onDelete={deletePlayer} />
        )}
      </div>

      {/* Bottom nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
        display: 'flex', height: 68,
        borderRadius: '20px 20px 0 0',
      }}>
        {([
          { id: 'matches' as Tab, label: 'Matcher', Icon: Calendar },
          { id: 'players' as Tab, label: 'Truppen', Icon: Users },
        ]).map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 4, border: 'none', background: 'none',
            cursor: 'pointer', padding: 0, transition: 'all 150ms ease-out',
          }}>
            <div style={{
              width: 40, height: 28, borderRadius: 14,
              background: tab === id ? '#C8E64C' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 150ms ease-out',
            }}>
              <Icon size={18} color={tab === id ? '#1A1A1A' : '#6B7280'} strokeWidth={tab === id ? 2.5 : 1.8} />
            </div>
            <span style={{
              fontSize: 12, fontWeight: tab === id ? 600 : 400,
              color: tab === id ? '#1A1A1A' : '#6B7280',
            }}>{label}</span>
          </button>
        ))}
      </nav>

      <FeedbackButton />
    </div>
  );
}

function TopBar({ title, showBack, onBack, userEmail, onSignOut }: {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  userEmail?: string;
  onSignOut?: () => void;
}) {
  return (
    <div style={{
      background: 'transparent',
      padding: '20px 20px 12px',
      display: 'flex', alignItems: 'center', gap: 12,
      maxWidth: 680, margin: '0 auto', width: '100%',
    }}>
      {showBack && onBack && (
        <button onClick={onBack} style={{
          background: '#fff', border: 'none', borderRadius: '50%',
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)', cursor: 'pointer', flexShrink: 0,
        }}>
          <ChevronRight size={18} color="#1A1A1A" style={{ transform: 'rotate(180deg)' }} />
        </button>
      )}
      {!showBack && (
        <img src="/lineup-manager/logo.png" alt="Lineup Manager" style={{ height: 28, objectFit: 'contain' }} />
      )}
      {showBack && <span style={{ fontWeight: 700, fontSize: 20, color: '#1A1A1A', flex: 1 }}>{title}</span>}
      {userEmail && onSignOut && (
        <button onClick={onSignOut} style={{
          background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 10,
          padding: '6px 12px', cursor: 'pointer', fontSize: 13,
          color: '#6B7280', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <LogOut size={14} color="#6B7280" />
          Logga ut
        </button>
      )}
    </div>
  );
}

function Splash() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#D9EC6E' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, background: '#fff', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
          <Calendar size={28} color="#1A1A1A" />
        </div>
        <div style={{ color: '#1A1A1A', fontSize: 15, fontWeight: 500 }}>Laddar...</div>
      </div>
    </div>
  );
}

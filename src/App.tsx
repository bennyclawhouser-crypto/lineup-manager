import { useState, useEffect } from 'react';
import PlayersPage from './pages/PlayersPage';
import MatchesPage from './pages/MatchesPage';
import MatchPlanPage from './pages/MatchPlanPage';
import type { Player, Match } from './types';

type Tab = 'matches' | 'players';

const STORAGE_KEY_PLAYERS = 'lineup_players';
const STORAGE_KEY_MATCHES = 'lineup_matches';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('matches');
  const [players, setPlayers] = useState<Player[]>(() => loadFromStorage(STORAGE_KEY_PLAYERS, []));
  const [matches, setMatches] = useState<Match[]>(() => loadFromStorage(STORAGE_KEY_MATCHES, []));
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(players)); }, [players]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_MATCHES, JSON.stringify(matches)); }, [matches]);

  const handleCreateMatch = (m: Match) => setMatches(prev => [...prev, m]);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'matches', label: 'Matcher', icon: '⚽' },
    { id: 'players', label: 'Truppen', icon: '👥' },
  ];

  if (activeMatch) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: "'Google Sans', Roboto, system-ui, sans-serif" }}>
        <TopBar title={activeMatch.opponent || 'Match'} onBack={() => setActiveMatch(null)} />
        <MatchPlanPage match={activeMatch} players={players} onBack={() => setActiveMatch(null)} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: "'Google Sans', Roboto, system-ui, sans-serif" }}>
      <TopBar title="Lineup Manager" />

      <div style={{ paddingBottom: 72 }}>
        {tab === 'matches' && (
          <MatchesPage matches={matches} players={players}
            onCreateMatch={handleCreateMatch} onSelectMatch={setActiveMatch} />
        )}
        {tab === 'players' && (
          <PlayersPage players={players} onUpdate={setPlayers} />
        )}
      </div>

      {/* Bottom nav — Material style */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #e0e0e0',
        display: 'flex', height: 64,
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 2, border: 'none', background: 'none',
              cursor: 'pointer', padding: 0,
              color: tab === t.id ? '#1a73e8' : '#5f6368',
            }}>
            <div style={{
              width: 64, height: 32, borderRadius: 16,
              background: tab === t.id ? '#e8f0fe' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
              fontSize: 18,
            }}>
              {t.icon}
            </div>
            <span style={{ fontSize: 12, fontWeight: tab === t.id ? 600 : 400 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TopBar({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div style={{
      background: '#fff', borderBottom: '1px solid #e0e0e0',
      padding: '0 16px', height: 56,
      display: 'flex', alignItems: 'center', gap: 12,
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          color: '#5f6368', borderRadius: '50%', display: 'flex',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z"/>
          </svg>
        </button>
      )}
      {!onBack && (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
          ⚽
        </div>
      )}
      <span style={{ fontWeight: 500, fontSize: 18, color: '#202124' }}>{title}</span>
    </div>
  );
}

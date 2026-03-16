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

  if (activeMatch) {
    return (
      <MatchPlanPage
        match={activeMatch}
        players={players}
        onBack={() => setActiveMatch(null)}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#1e3a5f', color: '#fff', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>⚽</span>
        <span style={{ fontWeight: 800, fontSize: 18 }}>Lineup Manager</span>
      </div>

      {/* Content */}
      <div style={{ paddingBottom: 70 }}>
        {tab === 'matches' && (
          <MatchesPage
            matches={matches}
            players={players}
            onCreateMatch={handleCreateMatch}
            onSelectMatch={setActiveMatch}
          />
        )}
        {tab === 'players' && (
          <PlayersPage players={players} onUpdate={setPlayers} />
        )}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #e5e7eb',
        display: 'flex',
      }}>
        {(['matches', 'players'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '12px 0', border: 'none', background: 'none',
              cursor: 'pointer', fontWeight: tab === t ? 700 : 400,
              color: tab === t ? '#2563eb' : '#6b7280',
              fontSize: 14,
              borderTop: tab === t ? '2px solid #2563eb' : '2px solid transparent',
            }}>
            {t === 'matches' ? '⚽ Matcher' : '👥 Truppen'}
          </button>
        ))}
      </div>
    </div>
  );
}

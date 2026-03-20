import { useState, useEffect, useCallback } from 'react';
import type { Player, Match } from '../types';
import { supabase } from '../lib/supabase';

const TEAM_ID_KEY = 'lineup_team_id';
const DEFAULT_TEAM_NAME = 'Mitt lag';

export function useTeamData() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bootstrap: ensure team exists
  const ensureTeam = useCallback(async () => {
    // Try cached team id first
    const cached = localStorage.getItem(TEAM_ID_KEY);
    if (cached) {
      const { data } = await supabase.from('teams').select('id').eq('id', cached).single();
      if (data) { setTeamId(cached); return cached; }
    }

    // Try to find existing team
    const { data: existing } = await supabase.from('teams').select('id').limit(1).single();
    if (existing) {
      localStorage.setItem(TEAM_ID_KEY, existing.id);
      setTeamId(existing.id);
      return existing.id;
    }

    // Create new team
    const { data: created, error } = await supabase
      .from('teams').insert({ name: DEFAULT_TEAM_NAME }).select('id').single();
    if (error || !created) { setError('Kunde inte skapa lag'); return null; }
    localStorage.setItem(TEAM_ID_KEY, created.id);
    setTeamId(created.id);
    return created.id;
  }, []);

  const loadData = useCallback(async (tid: string) => {
    const [{ data: pData }, { data: mData }] = await Promise.all([
      supabase.from('players').select('*').eq('team_id', tid).order('created_at'),
      supabase.from('matches').select('*').eq('team_id', tid).order('created_at'),
    ]);
    if (pData) setPlayers(pData as Player[]);
    if (mData) setMatches(mData as Match[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    ensureTeam().then(tid => { if (tid) loadData(tid); else setLoading(false); });
  }, [ensureTeam, loadData]);

  // --- Players ---
  const upsertPlayer = async (player: Player) => {
    const tid = teamId ?? await ensureTeam();
    if (!tid) return;
    const { full_name, ...dbPlayer } = player;
    const row = { ...dbPlayer, team_id: tid };
    const { error } = await supabase.from('players').upsert(row);
    if (error) { setError(error.message); return; }
    const stored = row as Player;
    setPlayers(prev => {
      const exists = prev.find(p => p.id === stored.id);
      return exists ? prev.map(p => p.id === stored.id ? stored : p) : [...prev, stored];
    });
  };

  const deletePlayer = async (id: string) => {
    await supabase.from('players').delete().eq('id', id);
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  // --- Matches ---
  const createMatch = async (match: Match) => {
    const tid = teamId ?? await ensureTeam();
    if (!tid) return;
    const row = { ...match, team_id: tid };
    const { error } = await supabase.from('matches').upsert(row);
    if (error) { setError(error.message); return; }
    setMatches(prev => [...prev, match]);
  };

  return {
    players, matches, teamId, loading, error,
    upsertPlayer, deletePlayer, createMatch,
    reload: () => teamId && loadData(teamId),
  };
}

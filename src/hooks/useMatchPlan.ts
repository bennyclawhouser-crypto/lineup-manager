import { useState, useEffect, useRef } from 'react';
import type { PeriodLineup } from '../types';
import { supabase } from '../lib/supabase';

export function useMatchPlan(matchId: string) {
  const [lineups, setLineups] = useState<PeriodLineup[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load plan
  useEffect(() => {
    supabase.from('match_plans').select('*').eq('match_id', matchId).single()
      .then(({ data }) => {
        if (data) { setPlanId(data.id); setLineups(data.lineups ?? []); }
      });
  }, [matchId]);

  // Realtime sync
  useEffect(() => {
    const channel = supabase.channel(`match_plan:${matchId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'match_plans',
        filter: `match_id=eq.${matchId}`,
      }, payload => {
        const row = payload.new as { lineups: PeriodLineup[]; id: string };
        if (row?.lineups) setLineups(row.lineups);
        if (row?.id) setPlanId(row.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  // Save lineups (debounced 800ms)
  const saveLineups = (newLineups: PeriodLineup[]) => {
    setLineups(newLineups);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSyncing(true);
      if (planId) {
        await supabase.from('match_plans')
          .update({ lineups: newLineups, updated_at: new Date().toISOString() })
          .eq('id', planId);
      } else {
        const { data } = await supabase.from('match_plans')
          .insert({ match_id: matchId, lineups: newLineups })
          .select('id').single();
        if (data) setPlanId(data.id);
      }
      setSyncing(false);
    }, 800);
  };

  return { lineups, saveLineups, syncing };
}

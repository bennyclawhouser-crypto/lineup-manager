import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface MatchComment {
  id: string;
  match_id: string;
  user_email: string;
  text: string;
  created_at: string;
}

export function useMatchComments(matchId: string) {
  const [comments, setComments] = useState<MatchComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('match_comments')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setComments(data as MatchComment[]);
        setLoading(false);
      });

    // Realtime
    const channel = supabase.channel(`match_comments:${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'match_comments',
        filter: `match_id=eq.${matchId}`,
      }, payload => {
        setComments(prev => [...prev, payload.new as MatchComment]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  const addComment = async (text: string, userEmail: string) => {
    const { error } = await supabase.from('match_comments').insert({
      match_id: matchId,
      user_email: userEmail || 'anonym',
      text: text.trim(),
    });
    if (error) console.error('addComment error:', error);
    return !error;
  };

  return { comments, loading, addComment };
}

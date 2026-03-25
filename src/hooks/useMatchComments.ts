import { useState, useEffect, useRef } from 'react';
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
  const seenIds = useRef(new Set<string>());

  const fetchAll = async () => {
    const { data } = await supabase
      .from('match_comments')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });
    if (data) {
      setComments(data as MatchComment[]);
      data.forEach(c => seenIds.current.add(c.id));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel(`match_comments_${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'match_comments',
        filter: `match_id=eq.${matchId}`,
      }, payload => {
        const c = payload.new as MatchComment;
        if (!seenIds.current.has(c.id)) {
          seenIds.current.add(c.id);
          setComments(prev => [...prev, c]);
        }
      })
      .subscribe(status => {
        // If realtime fails, fall back to polling every 5s
        if (status === 'CHANNEL_ERROR') {
          const interval = setInterval(fetchAll, 5000);
          return () => clearInterval(interval);
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  const addComment = async (text: string, userEmail: string) => {
    const { data, error } = await supabase.from('match_comments').insert({
      match_id: matchId,
      user_email: userEmail || 'anonym',
      text: text.trim(),
    }).select().single();

    if (error) {
      console.error('addComment error:', error);
      return false;
    }

    // Optimistically add to local state immediately (don't wait for realtime)
    if (data) {
      const c = data as MatchComment;
      if (!seenIds.current.has(c.id)) {
        seenIds.current.add(c.id);
        setComments(prev => [...prev, c]);
      }
    }
    return true;
  };

  return { comments, loading, addComment };
}

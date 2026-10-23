import { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Poll } from '../types';

function voterKey(userId: string | null): string {
  if (userId) return `user:${userId}`;
  try {
    let id = localStorage.getItem('actufoot-voter');
    if (!id) {
      id = `anon:${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem('actufoot-voter', id);
    }
    return id;
  } catch {
    return `anon:${Math.random().toString(36).slice(2)}`;
  }
}

/** Sondage du moment — votes réels stockés en base, résultats réels. */
export function PollWidget() {
  const { user } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [counts, setCounts] = useState<number[]>([]);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const key = useMemo(() => voterKey(user?.id ?? null), [user]);

  const load = async (pollId: string) => {
    const sb = getSupabase();
    if (!sb) return;
    // Résultats agrégés via fonction sécurisée (les votes bruts ne sont pas lisibles).
    const { data } = await sb.rpc('poll_results', { p_poll_id: pollId });
    const rows = (data ?? []) as { option_index: number; votes: number }[];
    const c: number[] = [];
    rows.forEach((r) => {
      c[r.option_index] = Number(r.votes) || 0;
    });
    setCounts(c);
    // Déjà voté ? Mémorisé localement après un vote (la contrainte d'unicité
    // en base protège aussi contre les doublons).
    try {
      setVoted(localStorage.getItem(`actufoot-voted:${pollId}`) === '1');
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const { data } = await sb
        .from('polls')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      if (data) {
        setPoll(data as Poll);
        await load((data as Poll).id);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const vote = async (index: number) => {
    const sb = getSupabase();
    if (!sb || !poll || voted) return;
    setError('');
    const { error: err } = await sb
      .from('poll_votes')
      .insert({ poll_id: poll.id, option_index: index, voter_key: key });
    if (err) {
      if (/duplicate|unique/i.test(err.message)) {
        setVoted(true);
        try {
          localStorage.setItem(`actufoot-voted:${poll.id}`, '1');
        } catch {
          /* ignore */
        }
      } else {
        setError('Vote non enregistré. Réessayez.');
      }
      return;
    }
    setVoted(true);
    try {
      localStorage.setItem(`actufoot-voted:${poll.id}`, '1');
    } catch {
      /* ignore */
    }
    await load(poll.id);
  };

  if (loading) return null;
  if (!poll) return null;

  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <section className="widget" aria-label="Sondage du moment">
      <h3>🗳️ Le sondage</h3>
      <div className="widget-body">
        <p style={{ fontWeight: 700, margin: '0 0 12px' }}>{poll.question}</p>
        {error && <p className="form-error">{error}</p>}
        {!voted ? (
          poll.options.map((opt, i) => (
            <button key={i} className="btn secondary poll-option" onClick={() => void vote(i)}>
              {opt}
            </button>
          ))
        ) : (
          <div>
            {poll.options.map((opt, i) => {
              const n = counts[i] || 0;
              const pct = total > 0 ? Math.round((n / total) * 100) : 0;
              return (
                <div key={i} className="poll-result">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{opt}</span>
                    <span className="pct">{pct} %</span>
                  </div>
                  <div className="poll-bar" aria-hidden="true">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <span className="dateline">
                    {n} vote{n > 1 ? 's' : ''}
                  </span>
                </div>
              );
            })}
            <p className="dateline" style={{ marginTop: 8 }}>
              {total} vote{total > 1 ? 's' : ''} au total. Merci de votre participation !
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

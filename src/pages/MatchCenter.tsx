import { useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { formatDateTimeFr } from '../lib/format';
import type { Match } from '../types';
import { Sidebar } from '../components/Sidebar';
import { EmptyState, NotConfigured } from '../components/EmptyState';

function MatchCard({ match }: { match: Match }) {
  const live = match.status === 'live';
  const finished = match.status === 'finished';
  return (
    <div className="match-card">
      <div className="competition">
        {match.competition}
        {live && <span className="badge" style={{ marginLeft: 8, background: '#fdecea', color: '#b3261e', borderColor: '#b3261e' }}>● En direct</span>}
        {finished && <span className="badge" style={{ marginLeft: 8 }}>Terminé</span>}
      </div>
      <p className="teams">
        {match.home_team} <span style={{ color: 'var(--muted)' }}>—</span> {match.away_team}
      </p>
      {(live || finished) && match.home_score !== null && match.away_score !== null ? (
        <p className="score">
          {match.home_score} – {match.away_score}
        </p>
      ) : (
        <p className="when">📅 {formatDateTimeFr(match.match_date)}</p>
      )}
      {match.venue && <p className="when">🏟️ {match.venue}</p>}
    </div>
  );
}

/**
 * Match Center — affiche UNIQUEMENT les matchs réellement enregistrés en base.
 * Aucun match ni score inventé : base vide = état vide honnête.
 */
export function MatchCenter() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const { data } = await sb
        .from('matches')
        .select('*')
        .order('match_date', { ascending: true })
        .limit(40);
      if (mounted) {
        setMatches((data ?? []) as Match[]);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="container" style={{ paddingTop: 30 }}>
        <NotConfigured />
      </div>
    );
  }
  if (loading) return <p className="loading">Chargement du Match Center…</p>;

  const upcoming = matches.filter((m) => m.status === 'scheduled');
  const live = matches.filter((m) => m.status === 'live');
  const finished = matches.filter((m) => m.status === 'finished');

  return (
    <div className="container">
      <div className="layout-2col">
        <main>
          <div className="page-head">
            <span className="kicker">Match Center</span>
            <h1>Matchs & résultats</h1>
            <p className="sub">Les rencontres suivies par la rédaction.</p>
          </div>

          {matches.length === 0 ? (
            <EmptyState title="Aucun match programmé pour le moment">
              Le calendrier des rencontres n’a pas encore été renseigné par la rédaction.
              Revenez bientôt.
            </EmptyState>
          ) : (
            <>
              {live.length > 0 && (
                <section aria-label="Matchs en direct">
                  <div className="section-head">
                    <h2>En direct</h2>
                  </div>
                  <div className="grid-cards">
                    {live.map((m) => (
                      <MatchCard key={m.id} match={m} />
                    ))}
                  </div>
                </section>
              )}
              {upcoming.length > 0 && (
                <section aria-label="Matchs à venir">
                  <div className="section-head">
                    <h2>À venir</h2>
                  </div>
                  <div className="grid-cards">
                    {upcoming.map((m) => (
                      <MatchCard key={m.id} match={m} />
                    ))}
                  </div>
                </section>
              )}
              {finished.length > 0 && (
                <section aria-label="Résultats">
                  <div className="section-head">
                    <h2>Résultats</h2>
                  </div>
                  <div className="grid-cards">
                    {finished.map((m) => (
                      <MatchCard key={m.id} match={m} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
        <Sidebar />
      </div>
    </div>
  );
}

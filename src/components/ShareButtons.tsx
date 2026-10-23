/** Boutons de partage — utilise le partage natif quand disponible, sinon copie le lien. */
export function ShareButtons({ title }: { title: string }) {
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* partage annulé : on ignore */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      alert('Lien copié dans le presse-papiers.');
    } catch {
      prompt('Copiez ce lien :', url);
    }
  };

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.href : '',
  )}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.href : '',
  )}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(
    `${title} ${typeof window !== 'undefined' ? window.location.href : ''}`,
  )}`;

  return (
    <div className="article-actions" aria-label="Partager cet article">
      <button className="btn secondary small" onClick={() => void share()}>
        🔗 Partager
      </button>
      <a className="btn secondary small" href={xUrl} target="_blank" rel="noopener noreferrer">
        X
      </a>
      <a className="btn secondary small" href={fbUrl} target="_blank" rel="noopener noreferrer">
        Facebook
      </a>
      <a className="btn secondary small" href={waUrl} target="_blank" rel="noopener noreferrer">
        WhatsApp
      </a>
    </div>
  );
}

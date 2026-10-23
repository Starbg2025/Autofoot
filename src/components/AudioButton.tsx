import { useEffect, useRef, useState } from 'react';

/** Lecture audio de l'article via Web Speech API (voix du navigateur, français). */
export function AudioButton({ title, excerpt, body }: { title: string; excerpt: string | null; body: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [supported] = useState(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window,
  );
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  if (!supported) return null;

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const text = `${title}. ${excerpt ?? ''} ${body}`.replace(/\s+/g, ' ').slice(0, 8000);
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'fr-FR';
    utter.rate = 1;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    utterRef.current = utter;
    synth.cancel();
    synth.speak(utter);
    setSpeaking(true);
  };

  return (
    <button className="btn secondary small" onClick={toggle} aria-pressed={speaking}>
      {speaking ? '⏹ Arrêter la lecture' : '🔊 Écouter l’article'}
    </button>
  );
}

import { useCallback, useRef, useState } from 'react';

/**
 * Dyktowanie głosowe pól tekstowych.
 *
 * Adam: „wprowadź opcję audio dyktowania tekstu — abym nie musiał pisać, ale
 * mówię, a ty spisujesz". Web Speech API nie ma typów w standardowej
 * bibliotece TS (`lib.dom` go nie zna), więc kształt poniżej to tylko to,
 * czego ten hook faktycznie używa — nie cały interfejs przeglądarki.
 */
interface DictationResult {
  transcript: string;
}
interface DictationResultList {
  [index: number]: { [index: number]: DictationResult };
}
interface DictationEvent {
  results: DictationResultList;
}
interface DictationRecognizer {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: DictationEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

/** Konstruktor rozpoznawania mowy — z prefiksem w Chrome, bez w reszcie. */
function pobierzKonstruktor(): (new () => DictationRecognizer) | undefined {
  const w = window as unknown as {
    SpeechRecognition?: new () => DictationRecognizer;
    webkitSpeechRecognition?: new () => DictationRecognizer;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/**
 * Nagrywa jedną wypowiedź po polsku i oddaje rozpoznany tekst przez
 * `onText`. `supported` mówi, czy przeglądarka w ogóle to potrafi — Firefox
 * i starsze Safari nie mają Web Speech API, więc przycisk dyktowania ma się
 * wtedy w ogóle nie pojawić, zamiast klikać się w nic.
 */
export function useDictation(onText: (transcript: string) => void) {
  const [listening, setListening] = useState(false);
  const recognizerRef = useRef<DictationRecognizer | null>(null);
  const supported = typeof window !== 'undefined' && !!pobierzKonstruktor();

  const start = useCallback(() => {
    const Konstruktor = pobierzKonstruktor();
    if (!Konstruktor) return;

    // Jedno kliknięcie nagrywa i kończy samo, gdy przeglądarka rozpozna ciszę
    // — dziecko/rodzic nie musi wiedzieć, kiedy „zatrzymać nagrywanie".
    const recognizer = new Konstruktor();
    recognizer.lang = 'pl-PL';
    recognizer.interimResults = false;
    recognizer.continuous = false;
    recognizer.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) onText(transcript);
    };
    recognizer.onerror = () => setListening(false);
    recognizer.onend = () => setListening(false);

    recognizerRef.current = recognizer;
    setListening(true);
    recognizer.start();
  }, [onText]);

  const stop = useCallback(() => {
    recognizerRef.current?.stop();
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, toggle };
}

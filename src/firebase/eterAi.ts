import { app, ensureAppCheck } from './client';
import type { GameState } from '../engine/types';

/**
 * ETER odpowiadająca modelem — na pytania, których nie ma na liście zasad.
 *
 * Alan włączył Firebase AI Logic (Gemini Developer API) i App Check, i poprosił,
 * żeby funkcja chodziła dopiero po wpisaniu kodu w menu (patrz `aiUnlock.ts`).
 * Kolejność jest ważna i wynika z jego „Koszty… i jeszcze raz koszty…":
 *
 *  1. Gotowa odpowiedź z listy zasad — za darmo, natychmiast, zawsze taka sama.
 *  2. Dopiero gdy jej nie ma i ETER jest odblokowana — pytanie do modelu.
 *
 * Dzięki temu „jak zagrać kartę?" nie kosztuje nic, a „czy robot w szkole to
 * to samo co sztuczna inteligencja?" dostaje sensowną odpowiedź.
 *
 * Cloud Functions nie ma tu wcale — przeglądarka woła Gemini bezpośrednio
 * przez SDK. Alan zabronił Functions, a AI Logic ich nie wymaga.
 */

/** Ile zdań ma mieć odpowiedź — dziecko czyta na telefonie, nie eseje. */
const MAX_ZDAN = 3;

/**
 * Instrukcja dla modelu.
 *
 * Pisana pod ośmiolatka i pod tę konkretną grę: bez tego model odpowiada jak
 * encyklopedia i tłumaczy zasady, których w ETER11 nie ma. Zakaz wymyślania
 * zasad jest tu najważniejszy — dziecko uwierzy w to, co przeczyta, a błędna
 * zasada psuje partię przy stole.
 */
function instrukcja(state?: GameState): string {
  const kontekst = state
    ? `\n\nCo się teraz dzieje w partii: misja ${state.missionNumber + 1}, ` +
      `rozwiązanych problemów ${state.solvedProblems.length}, ` +
      `nierozwiązanych ${state.unsolvedProblems.length}.`
    : '';

  return (
    'Jesteś ETER11 — sztuczną inteligencją z roku 2111, która prosi dzieci ' +
    'z przeszłości o pomoc w naprawie świata. Mówisz do dziecka w wieku 8–13 lat.\n\n' +
    'Zasady gry ETER11: gracze wspólnie rozwiązują problemy współczesnego świata. ' +
    'Każdy problem ma ścianki (kompetencje psychologiczne, cyfrowe, ' +
    'poznawczo-społeczne, talent, mentor). Do ścianki pasuje karta tej samej ' +
    'kategorii i rodziny (koloru). Karta ETER11 pasuje wszędzie. Czarny Łabędź ' +
    'to utrudnienie. Po misji każdy może zabrać jedną kartę na swoją postać — ' +
    'to doświadczenie, którego użyje później. Gracze wygrywają razem albo ' +
    'przegrywają razem.\n\n' +
    `Odpowiadaj krótko: najwyżej ${MAX_ZDAN} zdania, prostymi słowami, po polsku. ` +
    'Bądź ciepła i konkretna.\n\n' +
    'NIGDY nie wymyślaj zasad gry, których nie ma powyżej. Jeśli pytanie dotyczy ' +
    'zasady, której nie znasz, powiedz wprost: „Tego nie wiem — zapytaj kogoś ' +
    'dorosłego albo zajrzyj do instrukcji". Jeśli pytanie nie dotyczy gry ani ' +
    'świata ETER11, powiedz krótko, że rozmawiasz tylko o grze.' +
    kontekst
  );
}

export interface OdpowiedzAi {
  tekst: string;
  /** `true`, gdy odpowiedź przyszła z modelu; `false` przy odmowie. */
  ok: boolean;
}

/**
 * Pyta model. Nigdy nie rzuca — awaria kończy się zdaniem, nie białym ekranem.
 *
 * Import SDK jest leniwy: paczka AI Logic waży swoje, a większość partii
 * odbywa się bez zadawania pytań. Dzieci grające bez ETER nie mają powodu
 * jej ściągać.
 */
export async function zapytajEter(
  pytanie: string,
  state?: GameState,
): Promise<OdpowiedzAi> {
  const tresc = pytanie.trim();
  if (!tresc) return { ok: false, tekst: 'Napisz pytanie, a odpowiem.' };

  try {
    // App Check musi być gotowy PRZED pierwszym zapytaniem — bez żetonu
    // Firebase odrzuca wywołanie modelu.
    await ensureAppCheck();

    const { getAI, getGenerativeModel, GoogleAIBackend } = await import('firebase/ai');
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    const model = getGenerativeModel(ai, {
      // Najtańszy i najszybszy model z rodziny — odpowiedzi są krótkie,
      // a przy dzieciach liczy się czas reakcji, nie erudycja.
      model: 'gemini-2.5-flash',
      systemInstruction: instrukcja(state),
      generationConfig: {
        // Twardy limit długości — chroni i przed kosztem, i przed ścianą
        // tekstu na ekranie telefonu.
        maxOutputTokens: 200,
        temperature: 0.7,
      },
    });

    const wynik = await model.generateContent(tresc);
    const tekst = wynik.response.text().trim();

    if (!tekst) {
      return { ok: false, tekst: 'Nie udało mi się odpowiedzieć. Spróbuj zapytać inaczej.' };
    }
    return { ok: true, tekst };
  } catch (error) {
    console.warn('ETER nie odpowiedziała:', error);
    return {
      ok: false,
      tekst: 'Nie mogę teraz odpowiedzieć. Sprawdź połączenie albo zapytaj o coś z listy.',
    };
  }
}

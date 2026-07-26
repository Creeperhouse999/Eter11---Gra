import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Ostatnia siatka bezpieczeństwa: błąd w komponencie nie może zostawić
 * pustego ekranu.
 *
 * Bez tego dowolny wyjątek w renderze odmontowuje całe drzewo Reacta i gracz
 * widzi białą stronę — przy stole z dziećmi to koniec zabawy bez żadnego
 * wyjaśnienia. Tutaj dostaje komunikat i dwie drogi wyjścia: odświeżenie
 * (partia jest zapisana, więc wróci) albo porzucenie zapisu, gdyby to on
 * był przyczyną.
 *
 * Musi być klasą — React nie ma odpowiednika `componentDidCatch` w hookach.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Konsola to jedyne miejsce, w którym zostaje ślad — nie mamy zdalnego
    // zbierania błędów, a bez stosu wywołań zgłoszenie „coś nie działa"
    // jest nie do namierzenia.
    console.error('Nieoczekiwany błąd interfejsu:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <div className="rounded-2xl border-2 border-danger bg-surface p-6 text-center">
          <h1 className="font-display text-2xl font-bold text-danger">
            Coś poszło nie tak
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-dim">
            Gra napotkała błąd, którego nie potrafi obejść. Rozpoczęta partia
            jest zapisana — po odświeżeniu strony powinna wrócić tam, gdzie
            skończyliście.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-11 rounded-lg bg-accent px-6 py-3 font-display font-bold text-bg"
            >
              Odśwież stronę
            </button>

            <button
              type="button"
              onClick={() => {
                // Gdy to zapisany stan jest przyczyną, odświeżenie samo
                // niczego nie naprawi — trzeba go usunąć.
                try {
                  window.localStorage.removeItem('eter11:game');
                } catch {
                  // Brak dostępu do pamięci nic tu nie zmienia.
                }
                window.location.reload();
              }}
              className="min-h-11 rounded-lg border border-edge px-6 py-3 text-sm text-ink-dim transition hover:border-danger hover:text-danger"
            >
              Zacznij od nowa (skasuje zapisaną partię)
            </button>
          </div>

          {/* Bez szczegółów technicznych na ekranie: to gra dla dzieci 8–13,
              a treść błędu (ślady kodu, nazwy z konfiguracji) była dla nich
              szumem, potrafiła przestraszyć („config firebase") i nic im nie
              dawała. Pełny błąd i tak trafia do konsoli przeglądarki
              (`console.error` w componentDidCatch) — programista ma go tam,
              gdzie go szuka, a gracz widzi tylko czytelny komunikat. */}
        </div>
      </main>
    );
  }
}

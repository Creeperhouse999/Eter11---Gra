import { useCallback, useState } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmOptions {
  title: string;
  message: string;
  /** Etykieta przycisku potwierdzenia. Domyślnie „Potwierdź". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Wariant ostrzegawczy — dla operacji nieodwracalnych. */
  tone?: 'default' | 'danger';
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

/**
 * Potwierdzenie w oknie modalnym — zamiennik `window.confirm`.
 *
 * Zwraca funkcję zwracającą obietnicę, więc wywołanie wygląda jak natywne:
 * `if (await confirm({ ... })) { ... }`. Różnica jest taka, że nie blokuje
 * przeglądarki i da się to ostylować.
 *
 * Zwrócony element `dialog` trzeba wstawić do drzewa komponentu.
 */
export function useConfirm() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve });
      }),
    [],
  );

  const settle = (confirmed: boolean) => {
    pending?.resolve(confirmed);
    setPending(null);
  };

  const dialog = (
    <Modal
      open={pending !== null}
      title={pending?.title ?? ''}
      tone={pending?.tone ?? 'default'}
      onClose={() => settle(false)}
      footer={
        <>
          <Button onClick={() => settle(false)}>{pending?.cancelLabel ?? 'Anuluj'}</Button>
          <Button
            variant={pending?.tone === 'danger' ? 'danger' : 'primary'}
            onClick={() => settle(true)}
          >
            {pending?.confirmLabel ?? 'Potwierdź'}
          </Button>
        </>
      }
    >
      {pending?.message}
    </Modal>
  );

  return { confirm, dialog };
}

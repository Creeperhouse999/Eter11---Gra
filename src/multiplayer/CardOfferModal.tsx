import { Modal } from '../ui/controls/Modal';
import { Button } from '../ui/controls/Button';
import type { CardOffer, Room } from './types';

interface CardOfferModalProps {
  offer: CardOffer | null;
  room: Room;
  uid: string;
  /** Biorący przyjmuje — karta trafia na jego matę. */
  onAccept: () => void;
  /** Biorący odrzuca albo dający anuluje. */
  onDecline: () => void;
}

/**
 * Prośba o przekazanie karty, czekająca na potwierdzenie biorącego.
 *
 * Przy stole przekazanie jest natychmiastowe, ale online biorący musi
 * przyjąć — inaczej nie wiadomo, czy w ogóle patrzy. Okno widzi tylko ten,
 * kogo prośba dotyczy; dający widzi krótką informację, że czeka na odpowiedź.
 */
export function CardOfferModal({ offer, room, uid, onAccept, onDecline }: CardOfferModalProps) {
  if (!offer) return null;

  const from = room.players[offer.fromUid]?.name ?? 'Ktoś';
  const card = room.state?.mission?.played.find((p) => p.card.id === offer.cardId)?.card;
  const forMe = offer.toUid === uid;
  const fromMe = offer.fromUid === uid;

  // Prośba nie dla nas i nie od nas — nie pokazujemy nic.
  if (!forMe && !fromMe) return null;

  if (fromMe) {
    return (
      <Modal open title="Czekasz na odpowiedź" onClose={onDecline}>
        <p className="text-sm">
          Zaproponowałeś kartę <strong>{card?.name ?? ''}</strong> graczowi{' '}
          <strong>{room.players[offer.toUid]?.name ?? ''}</strong>. Czekamy, aż
          przyjmie albo odrzuci.
        </p>
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" onClick={onDecline}>
            Anuluj propozycję
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open title="Dostajesz kartę!" onClose={onDecline}>
      <p className="text-sm">
        <strong>{from}</strong> chce Ci dać kartę{' '}
        <strong className="text-accent">{card?.name ?? ''}</strong>. Przyjmujesz?
      </p>
      {card?.description && (
        <p className="mt-2 text-xs text-ink-dim">{card.description}</p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onDecline}>
          Nie, dziękuję
        </Button>
        <Button variant="primary" icon="tick" onClick={onAccept}>
          Przyjmij
        </Button>
      </div>
    </Modal>
  );
}

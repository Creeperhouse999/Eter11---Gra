import { useRef, useState } from 'react';
import type { Card } from '../engine/types';
import type { CardImage } from '../data/cardImages';
import { matchCardByFileName } from './cardImageMatch';
import { uploadImage } from '../firebase/upload';
import { newId } from './newId';
import { Button } from '../ui/controls/Button';
import { Select } from '../ui/controls/Select';
import { useToast } from '../ui/controls/Toast';
import { useConfirm } from '../ui/controls/useConfirm';

interface CardImagesEditorProps {
  cardImages?: CardImage[];
  cards: Card[];
  onChange: (patch: { cardImages: CardImage[]; cards: Card[] }) => void;
}

const UNASSIGNED = '';

/**
 * Biblioteka grafik kart.
 *
 * Zgłoszenie: dopasowywanie grafiki do karty dało się robić tylko pojedynczo,
 * w zakładce Karty. Tu wgrywa się od razu wiele plików naraz, a każdy trafia
 * do wspólnej biblioteki z listą rozwijaną karty obok — szybkie dopasowanie
 * bez szukania właściwej karty w osobnej zakładce. Plik nazwany jak id albo
 * nazwa karty (np. „psy-r-odpornosc.png" albo „Odporność psychiczna.png")
 * dopasowuje się sam.
 */
export function CardImagesEditor({ cardImages, cards, onChange }: CardImagesEditorProps) {
  const images = cardImages ?? [];
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const cardOptions = [
    { value: UNASSIGNED, label: '— nieprzypisana —' },
    ...cards.map((card) => ({ value: card.id, label: card.name })),
  ];

  const pick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const added: CardImage[] = [];
    const cardUpdates = new Map<string, string>();

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const fileName = file.name.replace(/\.[^.]+$/, '') || `grafika-${images.length + i}`;
      const result = await uploadImage({ file, folder: 'cards', name: newId('cardimg') });
      if (!result.ok || !result.url) {
        toast(result.error ?? 'Nie udało się wgrać grafiki.', 'danger');
        continue;
      }
      const matched = matchCardByFileName(file.name, cards);
      added.push({ id: newId('cimg'), url: result.url, fileName, cardId: matched?.id });
      if (matched) cardUpdates.set(matched.id, result.url);
    }

    if (added.length > 0) {
      const nextCards = cardUpdates.size
        ? cards.map((card) => (cardUpdates.has(card.id) ? { ...card, image: cardUpdates.get(card.id) } : card))
        : cards;
      onChange({ cardImages: [...images, ...added], cards: nextCards });
      const matchedCount = cardUpdates.size;
      toast(
        `Dodano ${added.length} ${added.length === 1 ? 'grafikę' : 'grafik'}` +
          (matchedCount > 0 ? `, ${matchedCount} dopasowano automatycznie po nazwie pliku.` : '.'),
        'success',
      );
    }
    setUploading(false);
    if (input.current) input.current.value = '';
  };

  const assign = (imageId: string, cardId: string) => {
    const image = images.find((i) => i.id === imageId);
    if (!image) return;
    const previousCardId = image.cardId;

    const nextImages = images.map((i) => (i.id === imageId ? { ...i, cardId: cardId || undefined } : i));
    const nextCards = cards.map((card) => {
      if (cardId && card.id === cardId) return { ...card, image: image.url };
      if (previousCardId && card.id === previousCardId && card.id !== cardId && card.image === image.url) {
        return { ...card, image: undefined };
      }
      return card;
    });
    onChange({ cardImages: nextImages, cards: nextCards });
  };

  const remove = async (imageId: string) => {
    const image = images.find((i) => i.id === imageId);
    if (!image) return;
    const confirmed = await confirm({
      title: 'Usunąć grafikę?',
      message: `„${image.fileName}" zniknie z biblioteki. ${
        image.cardId ? 'Karta, do której była przypisana, zostanie bez grafiki.' : ''
      }`,
      confirmLabel: 'Usuń',
      tone: 'danger',
    });
    if (!confirmed) return;

    const nextImages = images.filter((i) => i.id !== imageId);
    const nextCards = image.cardId
      ? cards.map((card) => (card.id === image.cardId && card.image === image.url ? { ...card, image: undefined } : card))
      : cards;
    onChange({ cardImages: nextImages, cards: nextCards });
    toast('Grafika usunięta.');
  };

  // Liczone przez filtr kart, nie odejmowanie: `cardId` osieroconego wpisu
  // (karta usunięta w zakładce Karty, gdy grafika wciąż ją wskazuje) inaczej
  // psułby wynik — odjęcie policzyłoby kartę, której już nie ma wśród `cards`.
  const assignedCardIds = new Set(images.filter((i) => i.cardId).map((i) => i.cardId));
  const unmatchedCards = cards.filter((card) => !assignedCardIds.has(card.id)).length;

  return (
    <section aria-label="Grafiki kart">
      {dialog}
      <h2 className="font-display text-lg font-bold">Grafiki kart</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-dim">
        Wgraj wiele grafik naraz, a potem dopasuj każdą do karty listą obok
        miniatury. Plik nazwany jak id karty (np. „psy-r-odpornosc.png") albo
        jak jej nazwa dopasuje się sam.
      </p>

      <div className="mt-4">
        <Button
          variant="primary"
          icon="upload"
          disabled={uploading}
          onClick={() => input.current?.click()}
        >
          {uploading ? 'Wgrywam…' : 'Wgraj grafiki'}
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          multiple
          className="hidden"
          onChange={(e) => void pick(e.target.files)}
        />
      </div>

      {images.length > 0 ? (
        <>
          <h3 className="eter-label mt-6">
            Biblioteka ({images.length}) · {unmatchedCards} {unmatchedCards === 1 ? 'karta' : 'kart'} bez grafiki
          </h3>
          <ul className="eter-stagger mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image) => (
              <li
                key={image.id}
                className="flex items-center gap-3 rounded-lg border border-edge bg-surface p-3"
              >
                <img
                  src={image.url}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={image.fileName}>
                    {image.fileName}
                  </p>
                  <Select
                    value={image.cardId ?? UNASSIGNED}
                    options={cardOptions}
                    ariaLabel={`Karta dla grafiki ${image.fileName}`}
                    onChange={(value) => assign(image.id, value)}
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  icon="trash"
                  aria-label={`Usuń grafikę ${image.fileName}`}
                  className="shrink-0 self-start text-danger"
                  onClick={() => void remove(image.id)}
                />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-6 text-sm text-ink-dim">
          Biblioteka jest pusta — wgraj pierwsze grafiki przyciskiem powyżej.
        </p>
      )}
    </section>
  );
}

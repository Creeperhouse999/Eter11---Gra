import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { app } from './client';

const storage = getStorage(app);

/**
 * Największy bok obrazka po kompresji.
 *
 * Zdjęcie z telefonu ma dziś 3000–4000 px i 3–8 MB. W zgłoszeniu chodzi
 * o pokazanie „tu jest źle", a nie o jakość wydruku — 1600 px starcza z
 * zapasem, a rozmiar spada kilkunastokrotnie. Ikona i tak jest mała.
 */
const MAX_EDGE = 1600;

/** Docelowa jakość JPEG. 0.82 to próg, poniżej którego widać artefakty. */
const QUALITY = 0.82;

export interface UploadResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/** Dozwolone typy bitmapowe — wszystkie foldery. */
const RASTER_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Foldery, do których SVG wolno wgrywać: tylko `icons` i `cards`, gdzie
 * pisze wyłącznie zalogowany zespół (reguły Storage — `czlonekZespolu()`).
 *
 * `reports` przyjmuje pliki od anonima bez konta wprost z gry (reguła
 * Storage celowo puszcza `create` bez logowania — zgłoszenie ma iść bez
 * konta). SVG to XML, nie bitmapa: może zawierać `<script>`/`onload`, a
 * `ImageLightbox` ma link „otwórz surowy plik", który otwiera Storage jako
 * dokument najwyższego poziomu — tam taki skrypt by się wykonał w oczach
 * zespołu przeglądającego zgłoszenie. `discussions` idzie tą samą ścieżką
 * wysyłki (`ImageUpload`), więc dla spójności ograniczone tak samo, choć
 * tam pisze już tylko zespół.
 */
const SVG_FOLDERS = new Set(['icons', 'cards']);

/**
 * Zmniejsza bitmapę przed wysłaniem.
 *
 * Rysujemy na canvasie w mniejszej skali. SVG omija ten krok — to tekst,
 * nie piksele, a przerysowanie na canvas straciłoby ostrość i przezroczystość.
 *
 * PNG NIE jest już przepuszczany bez zmian. Zrzut ekranu z telefonu to często
 * PNG ważący 5–12 MB — powyżej limitu reguł Storage (5 MB), więc wysyłka
 * padała na „Missing or insufficient permission" (reguła odrzuca za duży plik,
 * a komunikat brzmi jak brak uprawnień). Zgłosił to gracz, próbując dołączyć
 * zrzut błędu w dyskusji.
 *
 * PNG zapisujemy z powrotem jako PNG — zachowuje przezroczystość (JPEG nie ma
 * kanału alfa i tło zrobiłoby się czarne), a samo zmniejszenie wymiarów tnie
 * rozmiar wielokrotnie. Reszta bitmap (JPEG, WEBP) idzie do JPEG.
 */
async function compress(file: File): Promise<Blob> {
  if (file.type === 'image/svg+xml') return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return file;

  context.drawImage(bitmap, 0, 0, width, height);

  // PNG zostaje PNG (przezroczystość), reszta idzie do JPEG.
  const keepPng = file.type === 'image/png';
  const blob = await new Promise<Blob | null>((resolve) =>
    keepPng
      ? canvas.toBlob(resolve, 'image/png')
      : canvas.toBlob(resolve, 'image/jpeg', QUALITY),
  );
  // Gdyby toBlob zawiódł, wysyłamy oryginał — lepszy większy plik niż żaden.
  return blob ?? file;
}

/**
 * Wysyła obrazek do Storage i zwraca publiczny URL.
 *
 * `folder` rozdziela przeznaczenia: `icons`, `reports`, `discussions`.
 * Reguły Storage patrzą na ten prefiks, więc nazwa folderu jest częścią
 * kontraktu, nie dowolnością.
 *
 * Nazwa pliku jest przekazywana z zewnątrz, bo `Date.now()` i `Math.random()`
 * są w tym środowisku zablokowane — wołający składa unikalną nazwę z danych,
 * które ma (id zgłoszenia, licznik).
 */
export async function uploadImage(input: {
  file: File;
  folder: 'icons' | 'reports' | 'discussions' | 'cards';
  name: string;
}): Promise<UploadResult> {
  const isSvg = input.file.type === 'image/svg+xml';
  const allowed = RASTER_TYPES.includes(input.file.type) || (isSvg && SVG_FOLDERS.has(input.folder));
  if (!allowed) {
    return {
      ok: false,
      error: isSvg
        ? 'SVG nie jest tu dozwolony. Wyślij PNG, JPG albo WEBP.'
        : 'Dozwolone są obrazy PNG, JPG i WEBP.',
    };
  }

  try {
    const blob = await compress(input.file);

    // Twardy limit reguł Storage to 5 MB. Gdy plik mimo kompresji jest większy
    // (np. ogromny SVG albo kompresja się nie powiodła), Storage odrzuciłby go
    // komunikatem „Missing or insufficient permission" — mylącym, bo brzmi jak
    // brak uprawnień, a chodzi o rozmiar. Mówimy to wprost, zanim wyślemy.
    const LIMIT = 5 * 1024 * 1024;
    if (blob.size >= LIMIT) {
      return {
        ok: false,
        error: 'Obraz jest za duży (ponad 5 MB nawet po kompresji). Wyślij mniejszy albo zrób zrzut mniejszego fragmentu.',
      };
    }

    // Rozszerzenie z FAKTYCZNEGO typu bloba, nie z pliku wejściowego: PNG
    // zostaje PNG po kompresji, więc nie może dostać końcówki `.jpg`.
    const type = blob.type || input.file.type;
    const extension =
      type === 'image/svg+xml' ? 'svg' : type === 'image/png' ? 'png' : 'jpg';
    const path = `${input.folder}/${input.name}.${extension}`;

    const target = ref(storage, path);
    await uploadBytes(target, blob, { contentType: type });
    return { ok: true, url: await getDownloadURL(target) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Nie udało się wysłać obrazu: ${message}` };
  }
}

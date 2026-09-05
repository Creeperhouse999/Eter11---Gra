import { describe, it, expect } from 'vitest';
import {
  skrot,
  embedNoweZgloszenie,
  embedZmianaStanu,
  embedNowyWatek,
  embedOdpowiedz,
} from './discordMessage';
import { poprawnyWebhook } from './discord';
import type { Report } from './reports';
import type { Discussion } from './discussions';

/**
 * Alan poprosił o webhooka Discorda: „żeby tam była ładna lista, co się dzieje,
 * i ona będzie sama z panelu brać, a nie od ciebie".
 *
 * Formatu wiadomości nie da się sprawdzić okiem bez wysyłania czegoś na
 * prawdziwy kanał, więc pilnują go testy: co idzie w tytule, dokąd prowadzi
 * link i czy nie wysyłamy pustych ramek.
 */

function zgloszenie(over: Partial<Report>): Report {
  return {
    id: 'r1',
    title: 'Gra stoi przy stole',
    description: 'Dzieci czekają, nie da się zagrać karty.',
    author: 'Adam',
    kind: 'bug',
    status: 'new',
    createdAt: '2026-09-05T08:00:00.000Z',
    notes: [],
    ...over,
  } as Report;
}

describe('skracanie treści', () => {
  it('krótki tekst zostaje bez zmian', () => {
    expect(skrot('Krótko i na temat')).toBe('Krótko i na temat');
  });

  it('długi tekst tnie się na granicy słowa', () => {
    const wynik = skrot('a'.repeat(10) + ' ' + 'b'.repeat(400), 100);
    expect(wynik.endsWith('…')).toBe(true);
    expect(wynik.length).toBeLessThanOrEqual(101);
  });

  it('zwija wielokrotne odstępy i łamania linii', () => {
    expect(skrot('dwie\n\nlinie   z   odstępami')).toBe('dwie linie z odstępami');
  });
});

describe('ramka nowego zgłoszenia', () => {
  it('niesie tytuł, autora i link wprost do sprawy', () => {
    const embed = embedNoweZgloszenie(zgloszenie({ priority: 'ultra' }));
    expect(embed.title).toBe('Gra stoi przy stole');
    expect(embed.url).toContain('open=r1');
    expect(embed.fields?.find((f) => f.name === 'Zgłasza')?.value).toBe('Adam');
  });

  it('krytyczne odróżnia się kolorem od zwykłego', () => {
    const pilne = embedNoweZgloszenie(zgloszenie({ priority: 'ultra' }));
    const zwykle = embedNoweZgloszenie(zgloszenie({ priority: 'medium' }));
    expect(pilne.color).not.toBe(zwykle.color);
  });

  it('brak pilności czyta się jako zwykła', () => {
    const embed = embedNoweZgloszenie(zgloszenie({}));
    expect(embed.fields?.find((f) => f.name === 'Pilność')?.value).toBe('Zwykły');
  });
});

describe('ramka zmiany stanu', () => {
  it('mówi, co się stało, i prowadzi do właściwej zakładki', () => {
    const embed = embedZmianaStanu(zgloszenie({}), 'reopened', 'Dalej nie działa')!;
    expect(embed.footer?.text).toContain('poprawki');
    expect(embed.url).toContain('/reports/reopened');
    expect(embed.description).toBe('Dalej nie działa');
  });

  /**
   * O „nowym" i „czeka na akceptację" nie piszemy: pierwsze ma własną
   * wiadomość, drugie to sprawa wewnętrzna moderatora. Bez tego kanał
   * dostawałby dwie ramki o tym samym zgłoszeniu w tej samej sekundzie.
   */
  it('milczy o stanach, które nie są dla zespołu', () => {
    expect(embedZmianaStanu(zgloszenie({}), 'new')).toBeNull();
    expect(embedZmianaStanu(zgloszenie({}), 'pending')).toBeNull();
  });
});

/**
 * Alan: „obrazek dodawaj, jak jest w dyskusji / zgłoszeniu / wiadomości".
 * Przy usterce zrzut ekranu mówi więcej niż opis — bez niego trzeba i tak
 * wejść do panelu, czyli kanał traciłby sens.
 */
describe('zrzuty w ramkach', () => {
  it('zgłoszenie ze zrzutem pokazuje go pod ramką', () => {
    const embed = embedNoweZgloszenie(
      zgloszenie({ images: ['https://x/zrzut.png', 'https://x/drugi.png'] }),
    );
    // Discord pokazuje jeden obraz pod ramką; reszta czeka w panelu.
    expect(embed.image?.url).toBe('https://x/zrzut.png');
  });

  it('zgłoszenie bez zrzutu nie niesie pustego pola obrazu', () => {
    expect('image' in embedNoweZgloszenie(zgloszenie({}))).toBe(false);
  });

  it('zrzut dołączony do komentarza idzie razem ze zmianą stanu', () => {
    const embed = embedZmianaStanu(
      zgloszenie({}),
      'reopened',
      'Dalej nie działa',
      'https://x/dowod.png',
    )!;
    expect(embed.image?.url).toBe('https://x/dowod.png');
  });

  it('wątek założony ze zrzutem bierze go z pierwszej wypowiedzi', () => {
    const embed = embedNowyWatek({
      id: 'd1',
      title: 'Karta ETER11',
      description: '',
      author: 'Adam',
      createdAt: '2026-09-05T08:00:00.000Z',
      messages: [{ author: 'Adam', text: '', at: '2026-09-05T08:00:00.000Z', image: 'https://x/szkic.png' }],
    } as Discussion);
    expect(embed.image?.url).toBe('https://x/szkic.png');
  });

  it('odpowiedź ze zrzutem niesie go dalej', () => {
    const embed = embedOdpowiedz(
      { id: 'd1', title: 'Karta ETER11' },
      'Adam',
      'o to mi chodziło',
      'https://x/foto.png',
    );
    expect(embed.image?.url).toBe('https://x/foto.png');
  });
});

describe('ramki dyskusji', () => {
  const watek = {
    id: 'd1',
    title: 'Nazwa gry',
    description: 'Zastanówmy się nad nazwą.',
    author: 'Adam',
    createdAt: '2026-09-05T08:00:00.000Z',
    messages: [],
  } as Discussion;

  it('nowy wątek prowadzi do dyskusji', () => {
    expect(embedNowyWatek(watek).url).toContain('/discussions?open=d1');
  });

  it('odpowiedź mówi, kto pisze', () => {
    const embed = embedOdpowiedz(watek, 'Marcin', 'Może ETER11?');
    expect(embed.fields?.[0].value).toBe('Marcin');
    expect(embed.description).toBe('Może ETER11?');
  });

  it('sam obrazek bez tekstu nie wysyła pustej ramki', () => {
    expect(embedOdpowiedz(watek, 'Adam', '   ').description).toBe('(załączony obrazek)');
  });
});

/**
 * Adres webhooka jest jak hasło — kto go ma, pisze na kanał zespołu. Panel
 * musi odrzucić coś, co nim nie jest, zanim wyśle tam cokolwiek: wklejenie
 * cudzego adresu wysyłałoby treść zgłoszeń pod obcy serwer.
 */
describe('sprawdzanie adresu webhooka', () => {
  it('przyjmuje prawdziwy adres Discorda', () => {
    expect(
      poprawnyWebhook('https://discord.com/api/webhooks/123456789/abcDEF-ghi_JKL'),
    ).toBe(true);
    expect(
      poprawnyWebhook('https://discordapp.com/api/webhooks/123/abc'),
    ).toBe(true);
  });

  it('odrzuca obcy adres, http i puste pole', () => {
    expect(poprawnyWebhook('https://zly-serwer.example/api/webhooks/1/abc')).toBe(false);
    expect(poprawnyWebhook('http://discord.com/api/webhooks/123/abc')).toBe(false);
    expect(poprawnyWebhook('')).toBe(false);
    expect(poprawnyWebhook('   ')).toBe(false);
  });

  it('odrzuca adres podszywający się pod Discorda', () => {
    expect(poprawnyWebhook('https://discord.com.zly.example/api/webhooks/1/a')).toBe(false);
  });
});

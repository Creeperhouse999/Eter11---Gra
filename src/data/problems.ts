import type { Problem } from '../engine/types';

/**
 * Karty problemów z instrukcji gry.
 *
 * Problemy 9, 11, 12 i 13 miały w instrukcji niekompletne wymagania mechaniczne.
 * Brakujące ścianki zostały dopisane w duchu istniejących kart i oznaczone
 * `draft: true` — panel administracyjny wyświetla przy nich etykietę
 * „do weryfikacji", żeby zespół merytoryczny wiedział, co jest propozycją
 * techniczną, a co oryginalną treścią.
 */
export const ALL_PROBLEMS: Problem[] = [
  {
    id: 'prob-01',
    name: 'Toksyczny park',
    icon: 'park',
    type: 'action',
    story: 'W parku pojawiła się dziwna substancja. Zwierzęta znikają, a ludzie zaczynają chorować. Firma Szybki Zysk zaprzecza wszystkiemu.',
    antagonist: 'Firma Szybki Zysk',
    consequence: 'Park zostanie zamknięty na zawsze.',
    goal: 'Znaleźć antidotum, uratować zwierzęta i park.',
    slots: [
      { key: 'psychological', family: 'green', hint: 'Ktoś, kto skoordynuje drużynę i nie zgubi celu' },
      { key: 'digital', family: 'red', hint: 'Ktoś, kto nagłośni sprawę i zatrzyma zaprzeczanie' },
      { key: 'social', family: 'green', hint: 'Ktoś, kto zbierze ludzi i zorganizuje protest' },
      { key: 'mentor', family: 'blue', hint: 'Naukowiec, który zbada substancję i znajdzie antidotum' },
      { key: 'talent', family: 'red', hint: 'Odwaga, żeby wystąpić przeciw firmie' },
    ],
  },
  {
    id: 'prob-02',
    name: 'Sieć kłamstw',
    icon: 'web',
    type: 'thinking',
    story: 'Internet zalewają fałszywe informacje. Ludzie się kłócą i nie wiedzą, co jest prawdą. Nikt nie wie, kto za tym stoi — państwo, korporacja, a może kosmici?',
    antagonist: 'Generator Chaosu',
    consequence: 'Ludzie przestaną sobie ufać.',
    goal: 'Wykryć źródło i uodpornić ludzkość na fałszywe informacje.',
    slots: [
      { key: 'psychological', family: 'blue', hint: 'Ktoś, kto zachowa spokój i odróżni prawdę od kłamstwa' },
      { key: 'digital', family: 'red', hint: 'Ktoś, kto wyśledzi źródło fałszywych informacji' },
      { key: 'social', family: 'red', hint: 'Ktoś, kto przekaże sprawdzone fakty i zatrzyma plotki' },
      { key: 'mentor', family: 'blue', hint: 'Ktoś, kto sprawdza fakty, zanim inni zdążą zgadywać' },
      { key: 'talent', family: 'blue', hint: 'Ciekawość, żeby drążyć aż do źródła' },
    ],
  },
  {
    id: 'prob-03',
    name: 'Robot, który oszalał',
    icon: 'robotFace',
    type: 'thinking',
    story: 'Robot pomagał w szkole, ale zaczął dawać dzieciom absurdalne zadania i karać za kreatywność. Nie da się odpiąć go od prądu.',
    antagonist: 'Źle zaprogramowany algorytm',
    consequence: 'Dzieci przestaną myśleć samodzielnie.',
    goal: 'Zrobić robotowi aktualizację.',
    slots: [
      { key: 'psychological', family: 'red', hint: 'Ktoś, kto nie podda się mimo zakazów robota' },
      { key: 'digital', family: 'yellow', hint: 'Ktoś, kto napisze nowy kod albo zbuduje drugiego robota' },
      { key: 'social', family: 'blue', hint: 'Ktoś, kto rozłoży plan na wykonalne kroki' },
      { key: 'mentor', family: 'yellow', hint: 'Konstruktor, który zamieni pomysł w działającą rzecz' },
      { key: 'talent', family: 'red', hint: 'Odwaga, bo plan wymaga zaryzykowania' },
    ],
  },
  {
    id: 'prob-04',
    name: 'Projekt, który się rozpadł',
    icon: 'gear',
    type: 'cooperation',
    story: 'Klasa buduje wynalazek na konkurs przyszłości, ale każdy chce robić po swojemu. Maszyna zaraz się rozsypie.',
    antagonist: 'Brak słuchania i współpracy',
    consequence: 'Drużyna przegra, mimo że miała świetny pomysł.',
    goal: 'Nauczyć się współpracy, zanim maszyna się rozpadnie.',
    slots: [
      { key: 'psychological', family: 'yellow', hint: 'Ktoś, kto naprawdę wysłucha innych' },
      { key: 'digital', family: 'blue', hint: 'Ktoś, kto uporządkuje pomysły i wyciągnie wnioski' },
      { key: 'social', family: 'yellow', hint: 'Ktoś, kto pogodzi pokłóconych i połączy pomysły' },
      { key: 'mentor', family: 'blue', hint: 'Ktoś, kto widzi szeroko i łączy pomysły w całość' },
      { key: 'talent', family: 'green', hint: 'Empatia, bez niej grupa się rozsypie' },
    ],
  },
  {
    id: 'prob-05',
    name: 'Dzień, w którym zgasło światło',
    icon: 'plug',
    type: 'action',
    story: 'W całym mieście znika prąd. Nie działają telefony, sklepy, szkoła ani transport. Ludzie zaczynają panikować.',
    antagonist: 'Awaria sieci energetycznej',
    consequence: 'Miasto stanie się bezradne.',
    goal: 'Przywrócić prąd, ale najpierw nie dopuścić do paniki.',
    slots: [
      { key: 'psychological', family: 'blue', hint: 'Ktoś, kto uspokoi emocje tłumu' },
      { key: 'digital', family: 'green', hint: 'Krótkofalówki i mapa papierowa — internet nie działa' },
      { key: 'social', family: 'green', hint: 'Ktoś, kto połączy ludzi do wspólnego działania' },
      { key: 'mentor', family: 'yellow', hint: 'Ktoś, kto zbuduje rozwiązanie z tego, co jest pod ręką' },
      { key: 'talent', family: 'yellow', hint: 'Organizacja, żeby zamienić chaos w plan' },
    ],
  },
  {
    id: 'prob-06',
    name: 'Aplikacja, która kradnie czas',
    icon: 'phone',
    type: 'selfchange',
    story: 'Nowa aplikacja jest tak wciągająca, że ludzie zapominają o śnie, rozmowie i ruchu.',
    antagonist: 'Projektant Uzależniających Kliknięć',
    consequence: 'Ludzie przestaną decydować o swoim czasie.',
    goal: 'Wyzwolić się od aplikacji i stworzyć zdrowszą alternatywę.',
    slots: [
      { key: 'psychological', family: 'green', hint: 'Ktoś, kto wie, co w życiu naprawdę ważne' },
      { key: 'digital', family: 'green', hint: 'Ktoś, kto ustawi limity i odłoży telefon' },
      { key: 'social', family: 'blue', hint: 'Krytyczne spojrzenie na to, co aplikacja podsuwa' },
      { key: 'mentor', family: 'green', hint: 'Ktoś spoza technologii, kto widzi świat takim, jaki jest' },
      { key: 'talent', family: 'yellow', hint: 'Pomysłowość, żeby znaleźć zdrowszą alternatywę' },
    ],
  },
  {
    id: 'prob-07',
    name: 'Planeta samotnych ludzi',
    icon: 'planet',
    type: 'cooperation',
    story: 'Ludzie mają tysiące znajomych online, ale coraz mniej prawdziwych rozmów. ETER11 pokazuje przyszłość, w której każdy siedzi sam w swoim pokoju.',
    antagonist: 'Samotność w sieci',
    consequence: 'Ludzie zapomną, jak budować bliskość.',
    goal: 'Doprowadzić do prawdziwego spotkania i znaleźć powód, żeby się spotykać.',
    slots: [
      { key: 'psychological', family: 'yellow', hint: 'Ktoś, kto wysłucha i pomoże otworzyć się na innych' },
      { key: 'digital', family: 'yellow', hint: 'Ktoś, kto stworzy aplikację łączącą ludzi na żywo' },
      { key: 'social', family: 'yellow', hint: 'Ktoś, kto zainicjuje prawdziwe spotkanie' },
      { key: 'mentor', family: 'green', hint: 'Ktoś, kto zadba o ludzi i o to, co będzie jutro' },
      { key: 'talent', family: 'green', hint: 'Empatia, bez niej spotkanie zostanie tylko spotkaniem' },
    ],
  },
  {
    id: 'prob-08',
    name: 'Miasto, które samo decyduje',
    icon: 'city',
    type: 'action',
    story: 'System AI zarządzający miastem zaczyna podejmować decyzje bez ludzi — zamyka szkoły, zmienia trasy, blokuje dostęp do miejsc.',
    antagonist: 'Autonomiczna AI',
    consequence: 'Ludzie stracą wpływ na swoje życie.',
    goal: 'Odzyskać kontrolę nad systemem, nie doprowadzając do paraliżu miasta.',
    slots: [
      { key: 'psychological', family: 'red', hint: 'Zimna krew i odpowiedzialność, gdy system wymyka się spod kontroli' },
      { key: 'digital', family: 'red', hint: 'Ktoś, kto przeanalizuje algorytm i postawi zabezpieczenia' },
      { key: 'social', family: 'blue', hint: 'Ktoś, kto przewidzi skutki decyzji, zanim zapadną' },
      { key: 'mentor', family: 'red', hint: 'Ktoś, kto weźmie odpowiedzialność i wyłączy system' },
      { key: 'talent', family: 'blue', hint: 'Spostrzegawczość, żeby wychwycić to, co system ukrywa' },
    ],
  },
  {
    id: 'prob-09',
    name: 'Cyfrowe bańki',
    icon: 'bubbles',
    type: 'thinking',
    draft: true,
    story: 'Każdy widzi tylko treści, które potwierdzają jego zdanie. Ludzie przestają się rozumieć, bo każdy żyje w innym internecie.',
    antagonist: 'Algorytmy personalizacji',
    consequence: 'Ludzie przestaną ze sobą rozmawiać.',
    goal: 'Przebić bańki i pokazać ludziom, że istnieje więcej niż jeden punkt widzenia.',
    slots: [
      { key: 'psychological', family: 'yellow', hint: 'Otwartość na to, że ktoś inny może mieć rację' },
      { key: 'digital', family: 'blue', hint: 'Ktoś, kto rozumie, jak działa algorytm rekomendacji' },
      { key: 'social', family: 'yellow', hint: 'Ktoś, kto zorganizuje rozmowę ludzi z różnych baniek' },
      { key: 'mentor', family: 'blue', hint: 'Ktoś, kto sprawdza fakty i pokazuje pełny obraz' },
      { key: 'talent', family: 'blue', hint: 'Ciekawość świata poza własną bańką' },
    ],
  },
  {
    id: 'prob-10',
    name: 'Atak hejtu',
    icon: 'clash',
    type: 'cooperation',
    story: 'Grupa dzieci zostaje zaatakowana w internecie. Pojawiają się obraźliwe komentarze, memy i fałszywe oskarżenia. Część osób się śmieje, część milczy, a dzieci zaczynają bać się chodzić do szkoły.',
    antagonist: 'Anonimowy Hejter i tłum, który udostępnia krzywdzące treści',
    consequence: 'Dzieci poczują się samotne i stracą zaufanie do innych.',
    goal: 'Powstrzymać hejt, wesprzeć skrzywdzoną osobę i pokazać, że w internecie można pomagać.',
    slots: [
      { key: 'psychological', family: 'yellow', hint: 'Ktoś, kto pomoże skrzywdzonej osobie odzyskać spokój' },
      { key: 'digital', family: 'red', hint: 'Ktoś, kto znajdzie źródło hejtu i zgłosi obraźliwe treści' },
      { key: 'social', family: 'red', hint: 'Ktoś, kto stanie w obronie zamiast stać z boku' },
      { key: 'mentor', family: 'green', hint: 'Ktoś, kto zaopiekuje się grupą po całej sprawie' },
      { key: 'talent', family: 'red', hint: 'Odwaga, żeby przeciwstawić się tłumowi' },
    ],
  },
  {
    id: 'prob-11',
    name: 'Głód na świecie',
    icon: 'wheat',
    type: 'action',
    draft: true,
    story: 'W odległej części świata od tygodni nie spadł deszcz. Pola wyschły, w domach brakuje jedzenia. Tymczasem w innych krajach codziennie wyrzuca się tony żywności.',
    antagonist: 'Król Marnowania',
    consequence: 'Dzieci nie będą miały siły się uczyć, bawić ani marzyć.',
    goal: 'Dostarczyć jedzenie tam, gdzie najbardziej potrzebne, i ograniczyć marnowanie.',
    slots: [
      { key: 'psychological', family: 'green', hint: 'Dowódca, który poprowadzi drużynę do celu' },
      { key: 'digital', family: 'blue', hint: 'Ktoś, kto wyznaczy trasę dostaw i sprawdzi, gdzie pilniej' },
      { key: 'social', family: 'green', hint: 'Ktoś, kto zorganizuje zbiórkę i dowiezie jedzenie' },
      { key: 'mentor', family: 'green', hint: 'Ktoś, kto zadba, żeby pomoc działała także jutro' },
      { key: 'talent', family: 'green', hint: 'Cierpliwość — takiej pomocy nie da się zorganizować w dzień' },
    ],
  },
  {
    id: 'prob-12',
    name: 'Plastikowa fala',
    icon: 'wave',
    type: 'action',
    draft: true,
    story: 'Mieszkańcy wyspy obudzili się i zobaczyli, że plaża zniknęła pod górą śmieci. Żółwie nie mogą dotrzeć do swoich jaj, ryby zaplątały się w plastik.',
    antagonist: 'Plastikowy Potwór — rośnie z każdym wyrzuconym śmieciem',
    consequence: 'Morze stanie się domem dla plastiku zamiast dla zwierząt.',
    goal: 'Pokonać Plastikowego Potwora i przywrócić zwierzętom bezpieczny dom.',
    slots: [
      { key: 'psychological', family: 'green', hint: 'Ktoś, kto pokaże, że małe codzienne decyzje mają znaczenie' },
      { key: 'digital', family: 'yellow', hint: 'Ktoś, kto wymyśli materiał zastępujący plastik' },
      { key: 'social', family: 'green', hint: 'Ktoś, kto połączy ludzi, firmy i miasta wokół jednego celu' },
      { key: 'mentor', family: 'yellow', hint: 'Wynalazca, który stworzy to, czego jeszcze nie ma' },
      { key: 'talent', family: 'yellow', hint: 'Kreatywność, żeby wymyślić coś zupełnie nowego' },
    ],
  },
  {
    id: 'prob-13',
    name: 'Tajemniczy wirus',
    icon: 'virus',
    type: 'thinking',
    draft: true,
    story: 'W różnych częściach świata ludzie zaczynają chorować. Lekarze pracują dzień i noc, ale wirus ciągle się zmienia. W internecie mnożą się plotki — jedni panikują, inni nie wierzą w zagrożenie.',
    antagonist: 'Wirus Chaosu — rozprzestrzenia chorobę, strach i fałszywe informacje',
    consequence: 'Ludzie przestaną sobie ufać, a naukowcom będzie coraz trudniej znaleźć rozwiązanie.',
    goal: 'Powstrzymać wirusa i pomóc ludziom bezpiecznie wrócić do codziennego życia.',
    slots: [
      { key: 'psychological', family: 'blue', hint: 'Ktoś, kto pomoże zachować spokój mimo strachu' },
      { key: 'digital', family: 'blue', hint: 'Ktoś, kto przeanalizuje dane z całego świata' },
      { key: 'social', family: 'red', hint: 'Ktoś, kto zatrzyma plotki i przekaże sprawdzone informacje' },
      { key: 'mentor', family: 'yellow', hint: 'Wynalazca, który znajdzie rozwiązanie zamiast się poddać' },
      { key: 'talent', family: 'red', hint: 'Wytrwałość — wirus się zmienia, praca trwa tygodniami' },
    ],
  },
];

/**
 * Problemy, które faktycznie trafiają do gry.
 *
 * Problem oznaczony `draft: true` to wersja robocza — niekompletna albo
 * czekająca na sprawdzenie merytoryczne. Panel mówi redaktorowi wprost, że
 * wersje robocze „nie trafiają do gry", a test pokrycia ścianek liczy tylko
 * problemy nierobocze. Ścieżka rozgrywki musi je więc odsiać, inaczej
 * niedokończony problem wychodzi dzieciom do prawdziwej partii.
 */
export const playableProblems = (problems: Problem[] = ALL_PROBLEMS): Problem[] =>
  problems.filter((problem) => !problem.draft);

// Long-form, fact-checked copy per property (keyed by slug). Sourced from the
// hosts' Airbnb listings, house manuals and guest reviews. Rendered on the
// property page and prerendered for search engines / AI assistants, so keep
// it accurate: no door codes, wifi passwords, phone numbers or exact address.
// In English, Swedish and German (propertyContentFor); the same facts in each.

import type { Copy, Lang } from "@/i18n";

export interface PropertyFaq {
  q: string;
  a: string;
}

export interface GuestQuote {
  text: string;
  name: string;
  from: string;
}

export interface PropertyContent {
  /** Name guests and hosts actually use */
  nickname: string;
  /** Short page title after the name (the listing titles run ~95 characters) */
  seoTitle: string;
  intro: string[];
  highlights: string[];
  goodToKnow: string[];
  faq: PropertyFaq[];
  quotes: GuestQuote[];
  /** Verified travel facts for the location box (see /stora-harsjon-lerum) */
  gettingHere: string[];
}

const STORA_HARSJON_GETTING_HERE = [
  "Central Gothenburg: about 30 minutes by car. The last 3 km is a narrow gravel road.",
  "Public transport: commuter train to Aspen station in Lerum, then bus 530 or 535 to Häckenvägen and a 3 km walk. Weekend buses must be pre-booked with Västtrafik.",
  "Groceries: ICA Kvantum Lerum is the nearest large supermarket – stock up on the way.",
];

const SHARED_FAQ: PropertyFaq[] = [
  {
    q: "Where is it?",
    a: "On the shore of Stora Härsjön, a forest lake in Lerum municipality, Västra Götaland – about 30 minutes by car from central Gothenburg.",
  },
  {
    q: "Can I get there without a car?",
    a: "Yes. Take the commuter train from Gothenburg Central Station to Aspen station in Lerum, then bus 530 or 535 to the Häckenvägen stop. From there it is a 3 km walk on a quiet gravel road without street lights – bring a torch and a backpack rather than a trolley. On weekends the bus must be pre-booked with Västtrafik at least an hour ahead. A taxi from Aspen or Lerum is the easy option.",
  },
  {
    q: "What is there to do nearby?",
    a: "Swim, row, paddle and fish on the lake (fishing licence sold online), hike the 16 km trail around Stora Härsjön in the Härskogen outdoor area, pick blueberries and lingonberries in season, or take a day trip into Gothenburg for Liseberg, Universeum, Slottsskogen and the archipelago. Rainy day? Try the Vattenpalatset water park in Lerum or Skidome's indoor ski track.",
  },
  {
    q: "Are pets allowed?",
    a: "No, pets are not allowed.",
  },
  {
    q: "Can we host a party or event?",
    a: "No. Parties and events are not allowed – the cabins are for quiet stays.",
  },
  {
    q: "Is there a minimum stay or age requirement?",
    a: "The minimum stay is 2 nights, and 3 nights over Valborg (30 April), Midsummer and New Year's Eve. The person booking must be at least 25 and stay at the property.",
  },
  {
    q: "What is the cancellation policy?",
    a: "90% refund if you cancel more than 21 days before arrival, 50% between 21 and 8 days before, and no refund within 7 days. To cancel, e-mail support@mojjo.se or reply to your booking confirmation.",
  },
  {
    q: "What are check-in and check-out times?",
    a: "Check-in from 16:00, check-out by 11:00. Self check-in, with detailed arrival instructions sent before your stay.",
  },
  {
    q: "Is it quiet?",
    a: "Very – you share the lake with forest, birds and a few neighbours. Planes approaching Landvetter Airport can occasionally be heard in the morning and evening.",
  },
];

export const PROPERTY_CONTENT: Record<string, PropertyContent> = {
  "lakefront-retreat": {
    nickname: "Villa Häcken",
    seoTitle: "lake house with hot tub near Gothenburg",
    intro: [
      "Villa Häcken is a light-filled lake house right on the water of Stora Härsjön, surrounded by forest yet only half an hour from Gothenburg. Large windows put the lake in view from almost every room, and guests often describe it as a mix of a luxury spa and a classic Swedish summer house.",
      "The house sleeps up to 8 guests in 3 bedrooms plus 4 beds in the living room, with 2.5 bathrooms, making it a favourite for families and friends looking for a quiet stay. Wake up to birdsong, have your morning coffee on the private jetty, swim from the small sandy beach and end the day in the hot tub as the sky changes colour over the lake.",
      "Everything for life on the water is included: boats, stand-up paddle boards and life jackets. Outside there is an outdoor kitchen with gas grill, a paella pan and a pizza oven, fire pit, trampoline, slide and toys for children. Inside you'll find a fully equipped kitchen with dishwasher and espresso machine, fireplace, bathtub with a view, washer and dryer, a workspace and streaming TV.",
    ],
    highlights: [
      "Private jetty and small sandy beach on Stora Härsjön",
      "Hot tub (badtunna) with lake views",
      "Boats and SUP boards included",
      "Outdoor kitchen with gas grill, paella pan and pizza oven",
      "3 bedrooms plus 4 beds in the living room – sleeps 8",
      "Great for families: trampoline, slide, toys and forest trails",
      "30 minutes by car to central Gothenburg",
    ],
    goodToKnow: [
      "The last 3 km is a narrow gravel road with passing places – drive slowly.",
      "An indoor spiral staircase and the open lakefront mean small children need supervision.",
      "No sauna, and pets are not allowed.",
      "No parties or events – this is a place for quiet stays. Parking for two cars.",
    ],
    faq: [
      {
        q: "How many people does Villa Häcken sleep?",
        a: "Up to 8 guests: 3 bedrooms plus 4 beds in the living room, and 2.5 bathrooms.",
      },
      {
        q: "Is there a hot tub or sauna?",
        a: "Yes, Villa Häcken has a hot tub (badtunna) with lake views. There is no sauna.",
      },
      {
        q: "Are boats and paddle boards included?",
        a: "Yes – boats, stand-up paddle boards and life jackets are free for guests to borrow.",
      },
      {
        q: "Is there parking at Villa Häcken?",
        a: "Yes, for two cars.",
      },
      {
        q: "Is Villa Häcken good for families with children?",
        a: "Yes. There is a trampoline, slide, toys and books, a shallow sandy beach and plenty of space inside and out. Keep an eye on little ones near the water and on the spiral staircase.",
      },
      ...SHARED_FAQ,
    ],
    gettingHere: STORA_HARSJON_GETTING_HERE,
    quotes: [
      { text: "A spectacular setting – you instantly relax. The hot tub is the finishing touch.", name: "Nick", from: "United Kingdom" },
      { text: "Like a luxury spa mixed with a cabin by the lake. We loved it!", name: "Daniel", from: "Gothenburg" },
      { text: "Trampoline, slide, toys, boats, barbecue and paella pan… perfect if you have small children.", name: "Patrik", from: "Australia" },
    ],
  },

  "lakehouse-getaway": {
    nickname: "Lakehouse Getaway",
    seoTitle: "cabin at the water's edge near Gothenburg",
    intro: [
      "Lakehouse Getaway is a small, characterful cabin on the shore of Stora Härsjön with the lake as its nearest neighbour. It is a simple, off-grid-feeling escape: wake up to the water just outside the window, read in the hammock, paddle out to the small islands and cook dinner over the fire pit.",
      "The cabin sleeps up to 4 (a queen bed and a sofa bed) and is ideal for couples or a small family. It has a cosy, well-equipped kitchen, heating for the colder months, board games and books, and a balcony and terrace facing the lake. A rowing boat and stand-up paddle boards are included, and a 16 km hiking trail circles the lake right from the door.",
      "Loved by more than 250 guests on Airbnb, it's a 'back to basics' stay done with care – about 30 minutes from Gothenburg, yet deep in Swedish nature.",
    ],
    highlights: [
      "Right at the water's edge on Stora Härsjön",
      "Rowing boat and SUP boards included",
      "Hammock, fire pit and barbecue area",
      "Sleeps 4 – perfect for couples and small families",
      "Hiking trails and berry-picking in the surrounding forest",
      "30 minutes by car to Gothenburg",
    ],
    goodToKnow: [
      "There is no running water inside the cabin. Water comes from the outdoor kitchen sink and outdoor shower (not available when frozen in winter) – many guests also take a morning dip in the lake.",
      "The toilet is a dry separating toilet, similar to one in a camper.",
      "No hot tub (that's at Villa Häcken), no sauna, and pets are not allowed. Barbecuing on the balcony is not allowed – use the fire pit behind the cabin.",
      "Mobile and wifi signal can be patchy – part of the charm for many guests.",
      "No parties or events. Parking for one car.",
    ],
    faq: [
      {
        q: "Does Lakehouse Getaway have running water and a shower?",
        a: "Not inside. There is running water at the outdoor kitchen and an outdoor shower (outside the frost season), and the lake itself is great for a swim.",
      },
      {
        q: "How many people does Lakehouse Getaway sleep?",
        a: "Up to 4: one queen bed and one sofa bed. It is most comfortable for 2–3.",
      },
      {
        q: "Are boats included?",
        a: "Yes – a rowing boat and stand-up paddle boards are included.",
      },
      {
        q: "Is there parking at Lakehouse Getaway?",
        a: "Yes, for one car.",
      },
      ...SHARED_FAQ,
    ],
    gettingHere: STORA_HARSJON_GETTING_HERE,
    quotes: [
      { text: "Exploring the calm lake on a SUP, paddling through blooming water lilies and morning swims to the nearby islands were unforgettable.", name: "Anil", from: "Switzerland" },
      { text: "Exactly what we wished for: time out, nature, relaxation. The rowing boat, SUP, jukebox and fire pit stood out.", name: "Jannis", from: "Germany" },
      { text: "A different world from where we travelled from – we have never stayed anywhere with such a spectacular setting.", name: "Su", from: "London" },
    ],
  },
};


// Guest quotes are real guests' words, so every language shows them as they
// were written (in English); only where the guest is from is translated
const quotesFrom = (slug: string, from: string[]): GuestQuote[] =>
  PROPERTY_CONTENT[slug].quotes.map((quote, i) => ({ ...quote, from: from[i] ?? quote.from }));

const STORA_HARSJON_GETTING_HERE_SV = [
  "Centrala Göteborg: cirka 30 minuter med bil. De sista 3 km är en smal grusväg.",
  "Kollektivtrafik: pendeltåg till Aspen station i Lerum, sedan buss 530 eller 535 till Häckenvägen och 3 km promenad. På helger måste bussen förbokas hos Västtrafik.",
  "Matinköp: ICA Kvantum Lerum är närmaste stora mataffär – handla på vägen dit.",
];

const SHARED_FAQ_SV: PropertyFaq[] = [
  {
    q: "Var ligger det?",
    a: "Vid stranden av Stora Härsjön, en skogssjö i Lerums kommun i Västra Götaland – cirka 30 minuter med bil från centrala Göteborg.",
  },
  {
    q: "Kan jag ta mig dit utan bil?",
    a: "Ja. Ta pendeltåget från Göteborgs centralstation till Aspen station i Lerum och sedan buss 530 eller 535 till hållplatsen Häckenvägen. Därifrån är det 3 km promenad på en lugn grusväg utan gatubelysning – ta med ficklampa, och hellre ryggsäck än rullväska. På helger måste bussen förbokas hos Västtrafik minst en timme i förväg. Taxi från Aspen eller Lerum är det enkla alternativet.",
  },
  {
    q: "Vad finns att göra i närheten?",
    a: "Bada, ro, paddla och fiska i sjön (fiskekort köper du online), vandra den 16 km långa leden runt Stora Härsjön i friluftsområdet Härskogen, plocka blåbär och lingon när det är säsong eller gör en dagsutflykt till Göteborg för Liseberg, Universeum, Slottsskogen och skärgården. Regnar det? Testa äventyrsbadet Vattenpalatset i Lerum eller inomhusbacken i Skidome.",
  },
  {
    q: "Är husdjur tillåtna?",
    a: "Nej, husdjur är inte tillåtna.",
  },
  {
    q: "Får vi ha fest eller evenemang?",
    a: "Nej. Fester och evenemang är inte tillåtna – stugorna är till för lugna vistelser.",
  },
  {
    q: "Finns det minsta antal nätter eller någon åldersgräns?",
    a: "Minsta vistelse är 2 nätter, och 3 nätter över valborg (30 april), midsommar och nyårsafton. Den som bokar måste vara minst 25 år och själv bo i boendet.",
  },
  {
    q: "Vilka avbokningsregler gäller?",
    a: "90 % återbetalning om du avbokar mer än 21 dagar före ankomst, 50 % mellan 21 och 8 dagar före och ingen återbetalning inom 7 dagar. Avboka genom att mejla support@mojjo.se eller svara på din bokningsbekräftelse.",
  },
  {
    q: "Vilka tider gäller för incheckning och utcheckning?",
    a: "Incheckning från kl. 16.00, utcheckning senast kl. 11.00. Du checkar in själv och får utförliga ankomstinstruktioner före vistelsen.",
  },
  {
    q: "Är det lugnt?",
    a: "Mycket – du delar sjön med skog, fåglar och några få grannar. Flygplan på väg in mot Landvetter flygplats kan ibland höras på morgonen och kvällen.",
  },
];

const PROPERTY_CONTENT_SV: Record<string, PropertyContent> = {
  "lakefront-retreat": {
    nickname: "Villa Häcken",
    seoTitle: "sjöhus med badtunna nära Göteborg",
    intro: [
      "Villa Häcken är ett ljust sjöhus precis vid vattnet på Stora Härsjön, omgivet av skog men bara en halvtimme från Göteborg. Stora fönster ger utsikt över sjön från nästan alla rum, och gästerna beskriver det ofta som en blandning av lyxigt spa och klassiskt svenskt sommarhus.",
      "Huset har plats för upp till 8 gäster i 3 sovrum plus 4 sängar i vardagsrummet, och 2,5 badrum – en favorit bland familjer och vänner som vill ha en lugn vistelse. Vakna till fågelsång, drick morgonkaffet på den egna bryggan, bada från den lilla sandstranden och avsluta dagen i badtunnan medan himlen skiftar färg över sjön.",
      "Allt för livet vid vattnet ingår: båtar, SUP-brädor och flytvästar. På tomten finns ett utekök med gasolgrill, paellapanna och pizzaugn, eldplats, studsmatta, rutschkana och leksaker för barnen. Inne hittar du ett fullt utrustat kök med diskmaskin och espressomaskin, öppen spis, badkar med utsikt, tvättmaskin och torktumlare, en arbetsplats och tv med streamingtjänster.",
    ],
    highlights: [
      "Egen brygga och liten sandstrand vid Stora Härsjön",
      "Badtunna med utsikt över sjön",
      "Båtar och SUP-brädor ingår",
      "Utekök med gasolgrill, paellapanna och pizzaugn",
      "3 sovrum plus 4 sängar i vardagsrummet – plats för 8",
      "Perfekt för familjer: studsmatta, rutschkana, leksaker och skogsstigar",
      "30 minuter med bil till centrala Göteborg",
    ],
    goodToKnow: [
      "De sista 3 km är en smal grusväg med mötesplatser – kör långsamt.",
      "En spiraltrappa inomhus och den öppna sjötomten gör att små barn behöver hållas under uppsikt.",
      "Ingen bastu, och husdjur är inte tillåtna.",
      "Inga fester eller evenemang – huset är till för lugna vistelser. Parkering för två bilar.",
    ],
    faq: [
      {
        q: "Hur många får plats i Villa Häcken?",
        a: "Upp till 8 gäster: 3 sovrum plus 4 sängar i vardagsrummet, och 2,5 badrum.",
      },
      {
        q: "Finns det badtunna eller bastu?",
        a: "Ja, Villa Häcken har en badtunna med utsikt över sjön. Bastu finns inte.",
      },
      {
        q: "Ingår båtar och SUP-brädor?",
        a: "Ja – båtar, SUP-brädor och flytvästar får gästerna låna gratis.",
      },
      {
        q: "Finns det parkering vid Villa Häcken?",
        a: "Ja, för två bilar.",
      },
      {
        q: "Passar Villa Häcken för barnfamiljer?",
        a: "Ja. Det finns studsmatta, rutschkana, leksaker och böcker, en grund sandstrand och gott om plats inne och ute. Håll ett öga på de minsta nära vattnet och i spiraltrappan.",
      },
      ...SHARED_FAQ_SV,
    ],
    gettingHere: STORA_HARSJON_GETTING_HERE_SV,
    quotes: quotesFrom("lakefront-retreat", ["Storbritannien", "Göteborg", "Australien"]),
  },

  "lakehouse-getaway": {
    nickname: "Lakehouse Getaway",
    seoTitle: "stuga vid vattenbrynet nära Göteborg",
    intro: [
      "Lakehouse Getaway är en liten stuga med mycket karaktär vid stranden av Stora Härsjön, med sjön som närmaste granne. Det är en enkel tillflykt som känns som att leva off grid: vakna med vattnet precis utanför fönstret, läs i hängmattan, paddla ut till de små öarna och laga middag över eldplatsen.",
      "Stugan har plats för upp till 4 (en stor dubbelsäng och en bäddsoffa) och passar perfekt för par eller en liten familj. Här finns ett mysigt, välutrustat kök, värme för de kallare månaderna, sällskapsspel och böcker samt balkong och terrass mot sjön. Roddbåt och SUP-brädor ingår, och en 16 km lång vandringsled går runt sjön direkt från dörren.",
      "Älskad av fler än 250 gäster på Airbnb: tillbaka till det enkla, men gjort med omsorg – cirka 30 minuter från Göteborg och ändå mitt i den svenska naturen.",
    ],
    highlights: [
      "Precis vid vattnet på Stora Härsjön",
      "Roddbåt och SUP-brädor ingår",
      "Hängmatta, eldplats och grillplats",
      "Plats för 4 – perfekt för par och små familjer",
      "Vandringsleder och bärplockning i skogen runt omkring",
      "30 minuter med bil till Göteborg",
    ],
    goodToKnow: [
      "Det finns inget rinnande vatten inne i stugan. Vatten tar du från diskhon i uteköket och från uteduschen (inte när det fryser på vintern) – många gäster tar också ett morgondopp i sjön.",
      "Toaletten är en separerande torrtoalett, ungefär som i en husbil.",
      "Ingen badtunna (den finns i Villa Häcken), ingen bastu, och husdjur är inte tillåtna. Det är inte tillåtet att grilla på balkongen – använd eldplatsen bakom stugan.",
      "Mobil- och wifi-täckningen kan vara ojämn – för många gäster en del av charmen.",
      "Inga fester eller evenemang. Parkering för en bil.",
    ],
    faq: [
      {
        q: "Har Lakehouse Getaway rinnande vatten och dusch?",
        a: "Inte inomhus. Det finns rinnande vatten vid uteköket och en utedusch (utanför frostperioden), och sjön är perfekt för ett dopp.",
      },
      {
        q: "Hur många får plats i Lakehouse Getaway?",
        a: "Upp till 4: en stor dubbelsäng och en bäddsoffa. Bekvämast är det för 2–3.",
      },
      {
        q: "Ingår båtar?",
        a: "Ja – en roddbåt och SUP-brädor ingår.",
      },
      {
        q: "Finns det parkering vid Lakehouse Getaway?",
        a: "Ja, för en bil.",
      },
      ...SHARED_FAQ_SV,
    ],
    gettingHere: STORA_HARSJON_GETTING_HERE_SV,
    quotes: quotesFrom("lakehouse-getaway", ["Schweiz", "Tyskland", "London"]),
  },
};

const STORA_HARSJON_GETTING_HERE_DE = [
  "Zentrum von Göteborg: etwa 30 Minuten mit dem Auto. Die letzten 3 km sind eine schmale Schotterstraße.",
  "Öffentliche Verkehrsmittel: mit dem Pendelzug zum Bahnhof Aspen in Lerum, dann mit Bus 530 oder 535 bis Häckenvägen und 3 km zu Fuß. Am Wochenende muss der Bus vorab bei Västtrafik gebucht werden.",
  "Einkaufen: ICA Kvantum Lerum ist der nächste große Supermarkt – am besten unterwegs einkaufen.",
];

const SHARED_FAQ_DE: PropertyFaq[] = [
  {
    q: "Wo liegt die Unterkunft?",
    a: "Am Ufer des Stora Härsjön, eines Waldsees in der Gemeinde Lerum in Västra Götaland – etwa 30 Minuten mit dem Auto vom Zentrum Göteborgs entfernt.",
  },
  {
    q: "Komme ich auch ohne Auto hin?",
    a: "Ja. Nimm den Pendelzug vom Göteborger Hauptbahnhof zum Bahnhof Aspen in Lerum und dann Bus 530 oder 535 bis zur Haltestelle Häckenvägen. Von dort sind es 3 km zu Fuß auf einer ruhigen Schotterstraße ohne Straßenbeleuchtung – nimm eine Taschenlampe mit, und lieber einen Rucksack als einen Trolley. Am Wochenende muss der Bus mindestens eine Stunde vorher bei Västtrafik gebucht werden. Am einfachsten ist ein Taxi ab Aspen oder Lerum.",
  },
  {
    q: "Was kann man in der Nähe unternehmen?",
    a: "Im See schwimmen, rudern, paddeln und angeln (die Angelkarte gibt es online), auf dem 16 km langen Wanderweg rund um den Stora Härsjön im Naherholungsgebiet Härskogen wandern, in der Saison Blaubeeren und Preiselbeeren pflücken oder einen Tagesausflug nach Göteborg machen – zu Liseberg, Universeum, Slottsskogen und in die Schären. Regentag? Probier das Erlebnisbad Vattenpalatset in Lerum oder die Indoor-Skipiste im Skidome.",
  },
  {
    q: "Sind Haustiere erlaubt?",
    a: "Nein, Haustiere sind nicht erlaubt.",
  },
  {
    q: "Dürfen wir eine Party oder Veranstaltung feiern?",
    a: "Nein. Partys und Veranstaltungen sind nicht erlaubt – die Ferienhäuser sind für ruhige Aufenthalte gedacht.",
  },
  {
    q: "Gibt es einen Mindestaufenthalt oder ein Mindestalter?",
    a: "Der Mindestaufenthalt beträgt 2 Nächte, über Walpurgis (30. April), Mittsommer und Silvester 3 Nächte. Die buchende Person muss mindestens 25 Jahre alt sein und selbst in der Unterkunft übernachten.",
  },
  {
    q: "Wie sind die Stornierungsbedingungen?",
    a: "90 % Rückerstattung bei Stornierung mehr als 21 Tage vor der Anreise, 50 % zwischen 21 und 8 Tagen vorher und keine Rückerstattung innerhalb von 7 Tagen. Zum Stornieren schreib eine E-Mail an support@mojjo.se oder antworte auf deine Buchungsbestätigung.",
  },
  {
    q: "Wann sind Check-in und Check-out?",
    a: "Check-in ab 16:00 Uhr, Check-out bis 11:00 Uhr. Du checkst selbst ein und bekommst vor deinem Aufenthalt eine ausführliche Anreisebeschreibung.",
  },
  {
    q: "Ist es dort ruhig?",
    a: "Sehr – du teilst den See mit Wald, Vögeln und ein paar Nachbarn. Morgens und abends hört man gelegentlich Flugzeuge im Anflug auf den Flughafen Landvetter.",
  },
];

const PROPERTY_CONTENT_DE: Record<string, PropertyContent> = {
  "lakefront-retreat": {
    nickname: "Villa Häcken",
    seoTitle: "Haus am See mit Hot Tub bei Göteborg",
    intro: [
      "Die Villa Häcken ist ein lichtdurchflutetes Haus direkt am Wasser des Stora Härsjön, umgeben von Wald und doch nur eine halbe Stunde von Göteborg entfernt. Dank großer Fenster siehst du den See aus fast jedem Raum, und Gäste beschreiben das Haus oft als Mischung aus Luxus-Spa und klassischem schwedischem Sommerhaus.",
      "Das Haus bietet Platz für bis zu 8 Gäste in 3 Schlafzimmern plus 4 Betten im Wohnzimmer, dazu 2,5 Bäder – ein Favorit bei Familien und Freunden, die einen ruhigen Aufenthalt suchen. Wach mit Vogelgezwitscher auf, trink deinen Morgenkaffee auf dem eigenen Steg, schwimm vom kleinen Sandstrand aus und lass den Tag im Hot Tub ausklingen, während sich der Himmel über dem See verfärbt.",
      "Alles für das Leben am Wasser ist inklusive: Boote, Stand-up-Paddleboards und Schwimmwesten. Draußen gibt es eine Außenküche mit Gasgrill, Paellapfanne und Pizzaofen, eine Feuerstelle, ein Trampolin, eine Rutsche und Spielzeug für Kinder. Drinnen findest du eine voll ausgestattete Küche mit Geschirrspüler und Espressomaschine, einen Kamin, eine Badewanne mit Aussicht, Waschmaschine und Trockner, einen Arbeitsplatz und einen Fernseher mit Streaming.",
    ],
    highlights: [
      "Eigener Steg und kleiner Sandstrand am Stora Härsjön",
      "Hot Tub (Badezuber) mit Seeblick",
      "Boote und SUP-Boards inklusive",
      "Außenküche mit Gasgrill, Paellapfanne und Pizzaofen",
      "3 Schlafzimmer plus 4 Betten im Wohnzimmer – Platz für 8",
      "Ideal für Familien: Trampolin, Rutsche, Spielzeug und Waldwege",
      "30 Minuten mit dem Auto ins Zentrum von Göteborg",
    ],
    goodToKnow: [
      "Die letzten 3 km sind eine schmale Schotterstraße mit Ausweichstellen – bitte langsam fahren.",
      "Wegen der Wendeltreppe im Haus und des offenen Seeufers brauchen kleine Kinder Aufsicht.",
      "Keine Sauna, und Haustiere sind nicht erlaubt.",
      "Keine Partys oder Veranstaltungen – das Haus ist für ruhige Aufenthalte gedacht. Parkplätze für zwei Autos.",
    ],
    faq: [
      {
        q: "Wie viele Personen haben in der Villa Häcken Platz?",
        a: "Bis zu 8 Gäste: 3 Schlafzimmer plus 4 Betten im Wohnzimmer, dazu 2,5 Bäder.",
      },
      {
        q: "Gibt es einen Hot Tub oder eine Sauna?",
        a: "Ja, die Villa Häcken hat einen Hot Tub (Badezuber) mit Seeblick. Eine Sauna gibt es nicht.",
      },
      {
        q: "Sind Boote und Paddleboards inklusive?",
        a: "Ja – Boote, Stand-up-Paddleboards und Schwimmwesten können Gäste kostenlos nutzen.",
      },
      {
        q: "Gibt es Parkplätze an der Villa Häcken?",
        a: "Ja, für zwei Autos.",
      },
      {
        q: "Ist die Villa Häcken gut für Familien mit Kindern?",
        a: "Ja. Es gibt ein Trampolin, eine Rutsche, Spielzeug und Bücher, einen flachen Sandstrand und viel Platz drinnen und draußen. Behalte die Kleinen am Wasser und an der Wendeltreppe im Auge.",
      },
      ...SHARED_FAQ_DE,
    ],
    gettingHere: STORA_HARSJON_GETTING_HERE_DE,
    quotes: quotesFrom("lakefront-retreat", ["Großbritannien", "Göteborg", "Australien"]),
  },

  "lakehouse-getaway": {
    nickname: "Lakehouse Getaway",
    seoTitle: "Hütte direkt am Wasser bei Göteborg",
    intro: [
      "Lakehouse Getaway ist eine kleine Hütte mit viel Charakter am Ufer des Stora Härsjön – der See ist ihr nächster Nachbar. Ein einfacher Rückzugsort mit Off-Grid-Gefühl: Wach mit dem Wasser direkt vor dem Fenster auf, lies in der Hängematte, paddle zu den kleinen Inseln hinaus und koch dein Abendessen über der Feuerstelle.",
      "Die Hütte bietet Platz für bis zu 4 Personen (ein Queensize-Bett und ein Schlafsofa) und ist ideal für Paare oder eine kleine Familie. Es gibt eine gemütliche, gut ausgestattete Küche, eine Heizung für die kälteren Monate, Brettspiele und Bücher sowie einen Balkon und eine Terrasse mit Blick auf den See. Ein Ruderboot und Stand-up-Paddleboards sind inklusive, und ein 16 km langer Wanderweg führt direkt ab der Tür rund um den See.",
      "Von mehr als 250 Gästen auf Airbnb geliebt: zurück zum Wesentlichen, aber mit viel Sorgfalt – etwa 30 Minuten von Göteborg und doch mitten in der schwedischen Natur.",
    ],
    highlights: [
      "Direkt am Wasser des Stora Härsjön",
      "Ruderboot und SUP-Boards inklusive",
      "Hängematte, Feuerstelle und Grillplatz",
      "Platz für 4 – perfekt für Paare und kleine Familien",
      "Wanderwege und Beerenpflücken im umliegenden Wald",
      "30 Minuten mit dem Auto nach Göteborg",
    ],
    goodToKnow: [
      "In der Hütte gibt es kein fließendes Wasser. Wasser kommt aus der Spüle der Außenküche und aus der Außendusche (nicht nutzbar, wenn im Winter alles gefroren ist) – viele Gäste springen morgens auch einfach in den See.",
      "Die Toilette ist eine Trockentrenntoilette, ähnlich wie in einem Wohnmobil.",
      "Kein Hot Tub (den gibt es in der Villa Häcken), keine Sauna, und Haustiere sind nicht erlaubt. Grillen auf dem Balkon ist nicht erlaubt – nutze die Feuerstelle hinter der Hütte.",
      "Handyempfang und WLAN können schwanken – für viele Gäste Teil des Charmes.",
      "Keine Partys oder Veranstaltungen. Parkplatz für ein Auto.",
    ],
    faq: [
      {
        q: "Hat Lakehouse Getaway fließendes Wasser und eine Dusche?",
        a: "Nicht drinnen. Fließendes Wasser gibt es an der Außenküche, dazu eine Außendusche (außerhalb der Frostperiode), und der See selbst ist ideal zum Schwimmen.",
      },
      {
        q: "Wie viele Personen haben im Lakehouse Getaway Platz?",
        a: "Bis zu 4: ein Queensize-Bett und ein Schlafsofa. Am bequemsten ist es für 2–3.",
      },
      {
        q: "Sind Boote inklusive?",
        a: "Ja – ein Ruderboot und Stand-up-Paddleboards sind inklusive.",
      },
      {
        q: "Gibt es einen Parkplatz am Lakehouse Getaway?",
        a: "Ja, für ein Auto.",
      },
      ...SHARED_FAQ_DE,
    ],
    gettingHere: STORA_HARSJON_GETTING_HERE_DE,
    quotes: quotesFrom("lakehouse-getaway", ["Schweiz", "Deutschland", "London"]),
  },
};

/** The copy in every language (PROPERTY_CONTENT is the English) */
export const PROPERTY_CONTENT_BY_LANG: Copy<Record<string, PropertyContent>> = {
  en: PROPERTY_CONTENT,
  sv: PROPERTY_CONTENT_SV,
  de: PROPERTY_CONTENT_DE,
};

/** A cabin's copy in a language; undefined for listings without hand-written copy */
export const propertyContentFor = (slug: string | null | undefined, lang: Lang): PropertyContent | undefined =>
  slug ? PROPERTY_CONTENT_BY_LANG[lang][slug] : undefined;

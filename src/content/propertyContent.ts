// Long-form, fact-checked copy per property (keyed by slug). Sourced from the
// hosts' Airbnb listings, house manuals and guest reviews. Rendered on the
// property page and prerendered for search engines / AI assistants, so keep
// it accurate: no door codes, wifi passwords, phone numbers or exact address.

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
  intro: string[];
  highlights: string[];
  goodToKnow: string[];
  faq: PropertyFaq[];
  quotes: GuestQuote[];
}

const SHARED_FAQ: PropertyFaq[] = [
  {
    q: "Where is it?",
    a: "On the shore of Stora Härsjön, a forest lake in Lerum municipality, Västra Götaland – about 30 minutes by car from central Gothenburg.",
  },
  {
    q: "Can I get there without a car?",
    a: "Yes. Take the commuter train from Gothenburg Central Station to Aspen station in Lerum, then bus 530 to the Häckenvägen stop. From there it is a 3 km walk on a quiet gravel road without street lights – bring a torch and a backpack rather than a trolley. On weekends the bus must be pre-booked with Västtrafik at least an hour ahead. A taxi from Aspen or Lerum is the easy option.",
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
    intro: [
      "Villa Häcken is a light-filled lake house right on the water of Stora Härsjön, surrounded by forest yet only half an hour from Gothenburg. Large windows put the lake in view from almost every room, and guests often describe it as a mix of a luxury spa and a classic Swedish summer house.",
      "The house sleeps up to 8 guests across 4 bedrooms with 2.5 bathrooms, making it a favourite for families, friends and celebrations. Wake up to birdsong, have your morning coffee on the private jetty, swim from the small sandy beach and end the day in the hot tub as the sky changes colour over the lake.",
      "Everything for life on the water is included: boats, stand-up paddle boards and life jackets. Outside there is an outdoor kitchen with gas grill, a paella pan and a pizza oven, fire pit, trampoline, slide and toys for children. Inside you'll find a fully equipped kitchen with dishwasher and espresso machine, fireplace, bathtub with a view, washer and dryer, a workspace and streaming TV.",
    ],
    highlights: [
      "Private jetty and small sandy beach on Stora Härsjön",
      "Hot tub (badtunna) with lake views",
      "Boats and SUP boards included",
      "Outdoor kitchen with gas grill, paella pan and pizza oven",
      "4 bedrooms, 2.5 bathrooms – sleeps 8",
      "Great for families: trampoline, slide, toys and forest trails",
      "30 minutes by car to central Gothenburg",
    ],
    goodToKnow: [
      "The last 3 km is a narrow gravel road with passing places – drive slowly.",
      "An indoor spiral staircase and the open lakefront mean small children need supervision.",
      "No sauna, and pets are not allowed.",
    ],
    faq: [
      {
        q: "How many people does Villa Häcken sleep?",
        a: "Up to 8 guests in 4 bedrooms, with 2.5 bathrooms.",
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
        q: "Is Villa Häcken good for families with children?",
        a: "Yes. There is a trampoline, slide, toys and books, a shallow sandy beach and plenty of space inside and out. Keep an eye on little ones near the water and on the spiral staircase.",
      },
      ...SHARED_FAQ,
    ],
    quotes: [
      { text: "A spectacular setting – you instantly relax. The hot tub is the finishing touch.", name: "Nick", from: "United Kingdom" },
      { text: "Like a luxury spa mixed with a cabin by the lake. We loved it!", name: "Daniel", from: "Gothenburg" },
      { text: "Trampoline, slide, toys, boats, barbecue and paella pan… perfect if you have small children.", name: "Patrik", from: "Australia" },
    ],
  },

  "lakehouse-getaway": {
    nickname: "Lakehouse Getaway",
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
      ...SHARED_FAQ,
    ],
    quotes: [
      { text: "Exploring the calm lake on a SUP, paddling through blooming water lilies and morning swims to the nearby islands were unforgettable.", name: "Anil", from: "Switzerland" },
      { text: "Exactly what we wished for: time out, nature, relaxation. The rowing boat, SUP, jukebox and fire pit stood out.", name: "Jannis", from: "Germany" },
      { text: "A different world from where we travelled from – we have never stayed anywhere with such a spectacular setting.", name: "Su", from: "London" },
    ],
  },
};

// Areas shown on the home page. A cabin belongs to an area through its `city`
// (properties.city, lower case). Add an entry here when a cabin opens in a new
// area; areas without an active cabin are not shown.

export interface Area {
  name: string;
  city: string;
  /** The area guide page */
  path: string;
  blurb: string;
}

export const AREAS: Area[] = [
  {
    name: "Stora Härsjön, Lerum",
    city: "lerum",
    path: "/stora-harsjon-lerum",
    blurb:
      "A forest lake 30 minutes from Gothenburg: swim and paddle from the shore, hike the 16 km trail around the lake and pick berries in season.",
  },
];

import { Fragment } from "react";
import { Link } from "@/i18n/router";
import { AREAS } from "@/content/areas";
import { type Copy, useCopy } from "@/i18n";

const en = {
  firstTime: "First time in Sweden? Practical tips",
  areaGuide: (name: string) => `Area guide: ${name}`,
  travelGuides: "Travel guides",
  planning: "Planning your trip?",
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    firstTime: "Första gången i Sverige? Praktiska tips",
    areaGuide: (name) => `Områdesguide: ${name}`,
    travelGuides: "Reseguider",
    planning: "Planerar du resan?",
  },
  de: {
    firstTime: "Zum ersten Mal in Schweden? Praktische Tipps",
    areaGuide: (name) => `Reiseführer: ${name}`,
    travelGuides: "Reiseführer",
    planning: "Du planst deine Reise?",
  },
};

interface GuideProperty {
  city: string | null;
}

/**
 * One line of guide links. An area guide shows only while an active cabin is
 * in that area, so no single lake becomes a home page feature. Phase 2 adds
 * region cards above it ("Where to go in Sweden") once cabins are in 2+ counties.
 */
const TravelGuidesRow = ({ properties }: { properties: GuideProperty[] }) => {
  const t = useCopy(COPY);
  const guides = [
    { path: "/first-time-in-sweden", label: t.firstTime },
    ...AREAS.filter((area) => properties.some((p) => p.city?.toLowerCase() === area.city)).map((area) => ({
      path: area.path,
      label: t.areaGuide(area.name),
    })),
  ];

  return (
    <nav aria-label={t.travelGuides} className="bg-card py-10">
      <p className="container mx-auto px-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center">
        <span className="text-muted-foreground">{t.planning}</span>
        {guides.map((g, i) => (
          <Fragment key={g.path}>
            {/* On phones the links stack, where a dot would dangle at a line end */}
            {i > 0 && (
              <span className="hidden sm:inline text-muted-foreground" aria-hidden="true">
                ·
              </span>
            )}
            <Link to={g.path} className="font-medium text-primary hover:underline">
              {g.label}
            </Link>
          </Fragment>
        ))}
      </p>
    </nav>
  );
};

const ExploreSweden = ({ properties }: { properties: GuideProperty[] }) => <TravelGuidesRow properties={properties} />;

export default ExploreSweden;

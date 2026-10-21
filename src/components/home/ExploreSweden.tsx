import { Fragment } from "react";
import { Link } from "react-router-dom";
import { AREAS } from "@/content/areas";

interface GuideProperty {
  city: string | null;
}

/**
 * One line of guide links. An area guide shows only while an active cabin is
 * in that area, so no single lake becomes a home page feature. Phase 2 adds
 * region cards above it ("Where to go in Sweden") once cabins are in 2+ counties.
 */
const TravelGuidesRow = ({ properties }: { properties: GuideProperty[] }) => {
  const guides = [
    { path: "/first-time-in-sweden", label: "First time in Sweden? Practical tips" },
    ...AREAS.filter((area) => properties.some((p) => p.city?.toLowerCase() === area.city)).map((area) => ({
      path: area.path,
      label: `Area guide: ${area.name}`,
    })),
  ];

  return (
    <nav aria-label="Travel guides" className="bg-card py-10">
      <p className="container mx-auto px-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center">
        <span className="text-muted-foreground">Planning your trip?</span>
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

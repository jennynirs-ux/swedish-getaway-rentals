import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import LazyImage from "@/components/LazyImage";
import { AREAS } from "@/content/areas";

interface AreaProperty {
  id: string;
  city: string | null;
  hero_image_url: string | null;
}

const AreaCards = ({ properties }: { properties: AreaProperty[] }) => {
  const areas = AREAS.map((area) => ({
    area,
    cabins: properties.filter((p) => p.city?.toLowerCase() === area.city),
  })).filter((a) => a.cabins.length > 0);

  if (areas.length === 0) return null;

  // Photo of the area's last-listed cabin, so it differs from the first cabin card above

  return (
    <section className="py-16 bg-card">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-3xl font-bold text-foreground text-center mb-10">Explore the area</h2>
        <div className="grid gap-6">
          {areas.map(({ area, cabins }) => (
            <Link
              key={area.path}
              to={area.path}
              className="group grid sm:grid-cols-5 overflow-hidden rounded-lg border border-border bg-background hover:shadow-md transition-shadow"
            >
              <div className="sm:col-span-2 aspect-[16/10] sm:aspect-auto sm:min-h-full overflow-hidden">
                <LazyImage
                  src={cabins[cabins.length - 1].hero_image_url || "/placeholder.svg"}
                  alt={area.name}
                  sizes="(min-width: 640px) 360px, 100vw"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="sm:col-span-3 p-6 flex flex-col justify-center">
                <h3 className="text-xl font-semibold text-foreground">{area.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {cabins.length} {cabins.length === 1 ? "cabin" : "cabins"}
                </p>
                <p className="text-muted-foreground mt-3">{area.blurb}</p>
                <span className="mt-4 inline-flex items-center gap-1 font-medium text-primary">
                  Read the area guide
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
        <p className="text-center text-muted-foreground mt-8">
          First time in Sweden?{" "}
          <Link to="/first-time-in-sweden" className="text-primary hover:underline">
            Practical tips for your trip
          </Link>
        </p>
      </div>
    </section>
  );
};

export default AreaCards;

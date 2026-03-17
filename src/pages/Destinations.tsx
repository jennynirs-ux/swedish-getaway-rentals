import { Link } from 'react-router-dom';
import MainNavigation from '@/components/MainNavigation';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { useSeoMeta } from '@/hooks/useSeoMeta';
import { MapPin } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';

interface Destination {
  slug: string;
  name: string;
  country: string;
  description: string;
  image: string;
  keywords: string[];
}

const DESTINATIONS: Destination[] = [
  {
    slug: 'stockholm-archipelago',
    name: 'Stockholm Archipelago',
    country: 'Sweden',
    description: 'Over 30,000 islands stretching into the Baltic Sea. Perfect for sailing, kayaking, and discovering secluded beaches with traditional red cottages.',
    image: '/destinations/stockholm-archipelago.jpg',
    keywords: ['stockholm archipelago rental', 'swedish island cabin', 'archipelago vacation'],
  },
  {
    slug: 'swedish-lapland',
    name: 'Swedish Lapland',
    country: 'Sweden',
    description: 'Experience the Northern Lights, midnight sun, and pristine wilderness. Stay in cozy cabins surrounded by snow-covered forests and Sami culture.',
    image: '/destinations/swedish-lapland.jpg',
    keywords: ['northern lights cabin', 'lapland vacation rental', 'swedish lapland stay'],
  },
  {
    slug: 'dalarna',
    name: 'Dalarna',
    country: 'Sweden',
    description: 'The heart of Swedish tradition. Rolling hills, deep forests, and crystal-clear lakes. Home to Midsommar celebrations and the iconic Dalecarlian horse.',
    image: '/destinations/dalarna.jpg',
    keywords: ['dalarna cabin rental', 'midsommar stuga', 'swedish countryside'],
  },
  {
    slug: 'west-coast-sweden',
    name: 'West Coast',
    country: 'Sweden',
    description: 'Rocky coastline, fresh seafood, and charming fishing villages. Bohuslän offers world-class sailing and the famous Gothenburg culinary scene.',
    image: '/destinations/west-coast.jpg',
    keywords: ['bohuslan rental', 'west coast sweden cabin', 'gothenburg vacation'],
  },
  {
    slug: 'lofoten',
    name: 'Lofoten Islands',
    country: 'Norway',
    description: 'Dramatic peaks rising from the Arctic sea, traditional fishing villages, and the world\'s most beautiful fjords. A bucket-list destination year-round.',
    image: '/destinations/lofoten.jpg',
    keywords: ['lofoten cabin rental', 'norway fjord accommodation', 'lofoten rorbuer'],
  },
  {
    slug: 'finnish-lakeland',
    name: 'Finnish Lakeland',
    country: 'Finland',
    description: 'Europe\'s largest lake district with over 188,000 lakes. Sauna culture at its finest, surrounded by pristine forests and endless summer light.',
    image: '/destinations/finnish-lakeland.jpg',
    keywords: ['finnish lake cabin', 'finland sauna cottage', 'lakeland mökki'],
  },
  {
    slug: 'danish-coast',
    name: 'Danish Coast',
    country: 'Denmark',
    description: 'Miles of sandy beaches, windswept dunes, and hygge-filled seaside cottages. From Skagen\'s artistic heritage to the Wadden Sea UNESCO site.',
    image: '/destinations/danish-coast.jpg',
    keywords: ['danish summer house', 'denmark beach cottage', 'sommerhus denmark'],
  },
  {
    slug: 'varmland',
    name: 'Värmland',
    country: 'Sweden',
    description: 'Sweden\'s lake district with over 10,000 lakes. Dense forests perfect for moose safaris, canoeing, and finding true Scandinavian solitude.',
    image: '/destinations/varmland.jpg',
    keywords: ['varmland cabin', 'swedish lake house', 'värmland stuga'],
  },
];

export default function Destinations() {
  useSeoMeta({
    title: 'Nordic Destinations',
    description: 'Explore vacation rental destinations across Sweden, Norway, Finland, and Denmark. Find your perfect Nordic getaway from archipelagos to Arctic wilderness.',
    canonical: 'https://nordic-getaways.com/destinations',
  });

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: 'https://nordic-getaways.com' },
        { name: 'Destinations', url: 'https://nordic-getaways.com/destinations' },
      ]} />
      <MainNavigation />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#2D5F5D] to-[#1a3d3c] text-white pt-32 pb-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Nordic Destinations</h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            From Arctic wilderness to sun-drenched archipelagos. Discover the best places to stay across Scandinavia.
          </p>
        </div>
      </section>

      {/* Destinations Grid */}
      <main id="main-content" className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {DESTINATIONS.map((dest) => (
            <Link
              key={dest.slug}
              to={`/destinations/${dest.slug}`}
              className="group block rounded-xl overflow-hidden bg-card border shadow-sm hover:shadow-lg transition-all"
            >
              <div className="aspect-[16/10] bg-muted overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-[#2D5F5D]/20 to-[#2D5F5D]/5 flex items-center justify-center">
                  <MapPin className="w-12 h-12 text-muted-foreground/30" />
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold group-hover:text-primary transition-colors">
                    {dest.name}
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{dest.country}</p>
                <p className="text-sm text-muted-foreground line-clamp-3">{dest.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

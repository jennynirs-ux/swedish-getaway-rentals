import { useParams, Link } from 'react-router-dom';
import MainNavigation from '@/components/MainNavigation';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { useSeoMeta } from '@/hooks/useSeoMeta';
import { MapPin, ArrowLeft, Sun, Snowflake, Compass } from 'lucide-react';

interface DestinationData {
  slug: string;
  name: string;
  country: string;
  description: string;
  longDescription: string;
  image: string;
  bestSeason: string;
  highlights: string[];
  activities: string[];
  gettingThere: string;
  keywords: string[];
}

const DESTINATIONS: Record<string, DestinationData> = {
  'stockholm-archipelago': {
    slug: 'stockholm-archipelago',
    name: 'Stockholm Archipelago',
    country: 'Sweden',
    description: 'Over 30,000 islands stretching into the Baltic Sea.',
    longDescription:
      'The Stockholm Archipelago is one of the world\'s largest archipelagos, with over 30,000 islands, skerries, and rocks stretching 80 km into the Baltic Sea. From the lush inner islands with their classic red cottages to the windswept outer rocks where seals bask in the sun, it offers an incredible range of experiences. Many islands are car-free, accessible only by boat, preserving a timeless quality that makes every visit feel like stepping back in time.',
    image: '/destinations/stockholm-archipelago.jpg',
    bestSeason: 'June – August for swimming & sailing; September for autumn colors',
    highlights: [
      'Sandhamn — the sailing capital with sandy beaches',
      'Vaxholm — the gateway island with its historic fortress',
      'Grinda — family-friendly with great swimming',
      'Utö — the outermost inhabited island with a bakery dating to 1720',
      'Fjäderholmarna — just 25 minutes from central Stockholm',
    ],
    activities: ['Sailing', 'Kayaking', 'Swimming', 'Fishing', 'Island hopping', 'Foraging'],
    gettingThere: 'Waxholmsbolaget ferries depart from Strömkajen in central Stockholm. Journey times range from 25 minutes (Fjäderholmarna) to 3+ hours (outer islands).',
    keywords: ['stockholm archipelago rental', 'swedish island cabin', 'archipelago vacation'],
  },
  'swedish-lapland': {
    slug: 'swedish-lapland',
    name: 'Swedish Lapland',
    country: 'Sweden',
    description: 'Experience the Northern Lights, midnight sun, and pristine wilderness.',
    longDescription:
      'Swedish Lapland stretches across the Arctic Circle, offering two dramatically different seasons. In winter, the Northern Lights dance across dark skies while the landscape lies under deep snow — perfect for dog sledding, ice fishing, and staying in iconic ice hotels. In summer, the midnight sun never sets, and the wilderness comes alive with hiking trails, wild rivers, and the ancient Sami culture that has thrived here for thousands of years.',
    image: '/destinations/swedish-lapland.jpg',
    bestSeason: 'December – March for Northern Lights & snow; June – July for midnight sun',
    highlights: [
      'Abisko — best place in Sweden for Northern Lights viewing',
      'Jokkmokk — center of Sami culture, annual winter market since 1605',
      'Kungsleden (King\'s Trail) — Sweden\'s most famous hiking route',
      'Icehotel in Jukkasjärvi — rebuilt from ice every winter',
      'Gällivare — gateway to Stora Sjöfallet National Park',
    ],
    activities: ['Northern Lights tours', 'Dog sledding', 'Snowmobile safaris', 'Hiking', 'Ice fishing', 'Sami cultural experiences'],
    gettingThere: 'Fly to Kiruna or Luleå from Stockholm (1.5 hours). The overnight sleeper train from Stockholm to Kiruna is a scenic 17-hour journey.',
    keywords: ['northern lights cabin', 'lapland vacation rental', 'swedish lapland stay'],
  },
  'dalarna': {
    slug: 'dalarna',
    name: 'Dalarna',
    country: 'Sweden',
    description: 'The heart of Swedish tradition with rolling hills and crystal-clear lakes.',
    longDescription:
      'Dalarna is considered the most "Swedish" of all Swedish regions — the heartland of traditions, folklore, and natural beauty. This is where Midsommar is celebrated with the greatest fervor, where the iconic Dalecarlian horse originates, and where deep forests meet sparkling lakes. The region offers year-round appeal: skiing in Sälen and Idre in winter, lake swimming and hiking in summer, and cultural festivals throughout the year.',
    image: '/destinations/dalarna.jpg',
    bestSeason: 'Midsommar (late June) for festivals; January – March for skiing',
    highlights: [
      'Lake Siljan — the heart of Dalarna, ringed by charming villages',
      'Nusnäs — birthplace of the Dalecarlian horse, watch artisans paint them',
      'Tällberg — picturesque village overlooking Lake Siljan',
      'Sälen — Sweden\'s largest ski resort area',
      'Rättvik — traditional lakeside town with a historic 625m-long pier',
    ],
    activities: ['Midsommar celebrations', 'Skiing', 'Lake swimming', 'Hiking', 'Cultural tours', 'Fishing'],
    gettingThere: 'Drive from Stockholm (3 hours) or take the train to Borlänge/Mora (3–4 hours). Regional buses connect the smaller villages.',
    keywords: ['dalarna cabin rental', 'midsommar stuga', 'swedish countryside'],
  },
  'west-coast-sweden': {
    slug: 'west-coast-sweden',
    name: 'West Coast Sweden',
    country: 'Sweden',
    description: 'Rocky coastline, fresh seafood, and charming fishing villages.',
    longDescription:
      'Sweden\'s West Coast, centered around the Bohuslän region, is a world of smooth granite rocks, sheltered coves, and colorful fishing villages. The seafood here — particularly the langoustines, oysters, and crab — is among the best in Europe. Gothenburg, Sweden\'s second city, anchors the southern end with its acclaimed restaurant scene. Head north to discover islands like Marstrand, Smögen, and Fjällbacka, where the pace of life slows to match the gentle tides.',
    image: '/destinations/west-coast.jpg',
    bestSeason: 'July – August for beach & seafood; September for lobster premiär',
    highlights: [
      'Smögen — iconic boardwalk and vibrant summer atmosphere',
      'Marstrand — sailing paradise with a 17th-century fortress',
      'Fjällbacka — Ingrid Bergman\'s summer retreat, dramatic Kungsklyftan gorge',
      'Gothenburg — Sweden\'s culinary capital with 5 Michelin-starred restaurants',
      'Kosterhavet — Sweden\'s first marine national park',
    ],
    activities: ['Sailing', 'Seafood safaris', 'Seal watching', 'Rock bathing', 'Kayaking', 'Island hopping'],
    gettingThere: 'Fly or train to Gothenburg from Stockholm (1 hour flight / 3 hour train). Drive the coastal road north through Bohuslän.',
    keywords: ['bohuslan rental', 'west coast sweden cabin', 'gothenburg vacation'],
  },
  'lofoten': {
    slug: 'lofoten',
    name: 'Lofoten Islands',
    country: 'Norway',
    description: 'Dramatic peaks rising from the Arctic sea with traditional fishing villages.',
    longDescription:
      'The Lofoten Islands are Norway\'s crown jewel — a chain of dramatic islands above the Arctic Circle where jagged peaks rise straight from the sea. Despite their latitude, the Gulf Stream keeps temperatures surprisingly mild. Traditional red-painted fishermen\'s cabins (rorbuer) dot the harbors, many now converted into atmospheric accommodations. The light here is extraordinary: midnight sun in summer, Northern Lights in winter, and a golden, ethereal glow during the shoulder seasons.',
    image: '/destinations/lofoten.jpg',
    bestSeason: 'June – August for midnight sun & hiking; October – February for Northern Lights',
    highlights: [
      'Reine — often called Norway\'s most beautiful village',
      'Henningsvær — "the Venice of Lofoten" with its iconic football pitch',
      'Kvalvika Beach — a hidden beach between two mountains',
      'Svolvær — the capital of Lofoten with its goat horn peak',
      'Nusfjord — perfectly preserved 19th-century fishing village',
    ],
    activities: ['Hiking', 'Fishing', 'Surfing (Arctic!)', 'Northern Lights viewing', 'Whale watching', 'Photography'],
    gettingThere: 'Fly to Bodø or Harstad/Narvik, then ferry or bridge to the islands. The coastal express Hurtigruten also stops in Svolvær and Stamsund.',
    keywords: ['lofoten cabin rental', 'norway fjord accommodation', 'lofoten rorbuer'],
  },
  'finnish-lakeland': {
    slug: 'finnish-lakeland',
    name: 'Finnish Lakeland',
    country: 'Finland',
    description: 'Europe\'s largest lake district with over 188,000 lakes.',
    longDescription:
      'Finnish Lakeland is a vast, peaceful expanse of forest-fringed lakes that stretches across central and eastern Finland. With over 188,000 lakes, this is Europe\'s largest lake district. The Finnish summer cottage tradition (mökki) is at its most authentic here — a lakeside sauna, a dock for swimming, and nothing but birdsong and lapping water. It\'s the quintessential Finnish experience: slow living, pristine nature, and the magical light of the white nights.',
    image: '/destinations/finnish-lakeland.jpg',
    bestSeason: 'June – August for lake swimming & white nights; February for ice activities',
    highlights: [
      'Saimaa — Finland\'s largest lake, home to the endangered Saimaa ringed seal',
      'Savonlinna — medieval castle hosting the world-famous opera festival',
      'Punkaharju Ridge — a 7km esker winding between two lakes',
      'Jyväskylä — Alvar Aalto\'s architectural playground',
      'Lakeland sauna route — hop between traditional smoke saunas',
    ],
    activities: ['Sauna culture', 'Lake swimming', 'Canoeing', 'Berry picking', 'Ice fishing (winter)', 'Cross-country skiing'],
    gettingThere: 'Fly to Kuopio or Savonlinna from Helsinki (1 hour). Trains run from Helsinki to major lakeland cities (3–5 hours).',
    keywords: ['finnish lake cabin', 'finland sauna cottage', 'lakeland mökki'],
  },
  'danish-coast': {
    slug: 'danish-coast',
    name: 'Danish Coast',
    country: 'Denmark',
    description: 'Sandy beaches, windswept dunes, and hygge-filled seaside cottages.',
    longDescription:
      'Denmark\'s coastline offers a different flavor of Scandinavian coastal living — wide sandy beaches, rolling dunes, and the famous Danish sommerhus (summer house) culture. The west coast of Jutland faces the wild North Sea with its dramatic waves and vast beaches, while the north around Skagen offers a unique light that has inspired artists for centuries. The Wadden Sea on the southwest coast is a UNESCO World Heritage site teeming with birdlife.',
    image: '/destinations/danish-coast.jpg',
    bestSeason: 'July – August for beach; May – June for birdwatching at Wadden Sea',
    highlights: [
      'Skagen — where two seas meet, famous for its golden light and artists\' colony',
      'Blåvand — Denmark\'s westernmost point with vast beaches',
      'Ribe — Scandinavia\'s oldest town, near the Wadden Sea',
      'Løkken — charming beach town with white bathhouses',
      'Wadden Sea National Park — UNESCO World Heritage Site',
    ],
    activities: ['Beach life', 'Cycling', 'Birdwatching', 'Kite surfing', 'Seal safaris', 'Art gallery visits'],
    gettingThere: 'Fly to Billund or Aalborg. Drive or take regional trains along the coast. The Jutland coast is 3–5 hours from Copenhagen by car.',
    keywords: ['danish summer house', 'denmark beach cottage', 'sommerhus denmark'],
  },
  'varmland': {
    slug: 'varmland',
    name: 'Värmland',
    country: 'Sweden',
    description: 'Sweden\'s lake district with over 10,000 lakes and dense forests.',
    longDescription:
      'Värmland is Sweden\'s best-kept secret — a region of deep forests, rolling hills, and over 10,000 lakes bordering Norway. It\'s a paradise for those seeking true Scandinavian solitude. Moose safaris through ancient forests, multi-day canoe trips on peaceful rivers, and timber-floating traditions that date back centuries. The region is also the birthplace of literary legends like Selma Lagerlöf, Nobel Prize winner, whose estate Mårbacka is open to visitors.',
    image: '/destinations/varmland.jpg',
    bestSeason: 'June – September for outdoor activities; autumn for moose season',
    highlights: [
      'Klarälven River — iconic multi-day timber raft trips',
      'Mårbacka — Selma Lagerlöf\'s estate, beautifully preserved',
      'Glaskogen Nature Reserve — 28,000 hectares of pristine wilderness',
      'Sunne — cultural center on the shores of Lake Fryken',
      'Torsby — gateway to the Finnish-Swedish forest culture (Finnskogen)',
    ],
    activities: ['Timber raft floating', 'Moose safaris', 'Canoeing', 'Fishing', 'Hiking', 'Berry & mushroom foraging'],
    gettingThere: 'Drive from Stockholm (3.5 hours) or Gothenburg (3 hours). Trains to Karlstad (3 hours from Stockholm), then local buses.',
    keywords: ['varmland cabin', 'swedish lake house', 'värmland stuga'],
  },
};

export default function DestinationDetail() {
  const { slug } = useParams<{ slug: string }>();
  const destination = slug ? DESTINATIONS[slug] : null;

  useSeoMeta(destination ? {
    title: `${destination.name} — Nordic Vacation Rentals`,
    description: destination.longDescription.slice(0, 160),
    canonical: `https://nordic-getaways.com/destinations/${slug}`,
    ogImage: destination.image,
  } : {
    title: 'Destination Not Found',
    description: 'The destination you are looking for does not exist.',
  });

  if (!destination) {
    return (
      <div className="min-h-screen bg-background">
        <MainNavigation />
        <div className="container mx-auto px-4 pt-32 text-center">
          <h1 className="text-3xl font-bold mb-4">Destination not found</h1>
          <Link to="/destinations" className="text-primary hover:underline">
            View all destinations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://nordic-getaways.com' },
          { name: 'Destinations', url: 'https://nordic-getaways.com/destinations' },
          { name: destination.name, url: `https://nordic-getaways.com/destinations/${destination.slug}` },
        ]}
      />
      <MainNavigation />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#2D5F5D] to-[#1a3d3c] text-white pt-32 pb-16">
        <div className="container mx-auto px-4">
          <Link
            to="/destinations"
            className="inline-flex items-center gap-1 text-white/70 hover:text-white mb-6 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All Destinations
          </Link>
          <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
            <MapPin className="w-4 h-4" />
            {destination.country}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{destination.name}</h1>
          <p className="text-lg text-white/80 max-w-3xl">{destination.description}</p>
        </div>
      </section>

      {/* Content */}
      <main id="main-content" className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-10">
            <section>
              <h2 className="text-2xl font-bold mb-4">About {destination.name}</h2>
              <p className="text-muted-foreground leading-relaxed">{destination.longDescription}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Highlights</h2>
              <ul className="space-y-3">
                {destination.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Compass className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{h}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Things to Do</h2>
              <div className="flex flex-wrap gap-2">
                {destination.activities.map((a) => (
                  <span
                    key={a}
                    className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Getting There</h2>
              <p className="text-muted-foreground leading-relaxed">{destination.gettingThere}</p>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center gap-2 mb-3">
                {destination.bestSeason.toLowerCase().includes('december') ||
                destination.bestSeason.toLowerCase().includes('january') ||
                destination.bestSeason.toLowerCase().includes('february') ? (
                  <Snowflake className="w-5 h-5 text-blue-500" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500" />
                )}
                <h3 className="font-bold">Best Time to Visit</h3>
              </div>
              <p className="text-sm text-muted-foreground">{destination.bestSeason}</p>
            </div>

            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-bold mb-3">Find Your Stay</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Browse vacation rentals in {destination.name}.
              </p>
              <Link
                to={`/?search=${encodeURIComponent(destination.name)}`}
                className="block w-full text-center px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Search Properties
              </Link>
            </div>

            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-bold mb-3">Explore More</h3>
              <div className="space-y-2">
                {Object.values(DESTINATIONS)
                  .filter((d) => d.slug !== destination.slug)
                  .slice(0, 4)
                  .map((d) => (
                    <Link
                      key={d.slug}
                      to={`/destinations/${d.slug}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      {d.name}
                    </Link>
                  ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

import { useParams, Link } from 'react-router-dom';
import MainNavigation from '@/components/MainNavigation';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { useSeoMeta } from '@/hooks/useSeoMeta';
import { Calendar, Clock, ArrowLeft, ArrowRight } from 'lucide-react';
import { BLOG_POSTS } from './Blog';

/**
 * Full blog post content. In production this would come from a CMS / Supabase.
 * For now, static content seeded here so the pages are crawlable and indexable.
 */
const BLOG_CONTENT: Record<string, string[]> = {
  'ultimate-guide-midsommar-sweden': [
    'Midsommar is Sweden\'s most cherished celebration, marking the summer solstice with flower-crowned maypoles, traditional folk music, and tables laden with pickled herring, fresh potatoes, and strawberries with cream. It\'s a holiday that embodies everything magical about the Swedish summer.',
    'The celebration typically falls on the Friday closest to June 24th. Swedes take the day (and often the entire week) off work to gather with family and friends, usually at a countryside stuga. The festivities begin in the afternoon when the maypole (midsommarstång) is raised and decorated with wildflowers and greenery.',
    'Dancing around the maypole is the heart of the celebration. The most famous dance, "Små grodorna" (The Little Frogs), involves adults and children hopping around the pole like frogs — it\'s as silly and joyful as it sounds. Other traditional dances and songs follow, often accompanied by fiddle music.',
    'The traditional Midsommar meal is remarkably consistent across Sweden: pickled herring in various preparations, boiled new potatoes with dill and sour cream, gravlax (cured salmon), and for dessert, the first Swedish strawberries of the season with whipped cream. Aquavit (snaps) flows freely, accompanied by drinking songs.',
    'The best places to experience an authentic Midsommar include Dalarna (particularly around Lake Siljan), the Stockholm Archipelago, and Gotland. Dalarna is considered the heartland of Midsommar celebrations, with the largest and most traditional festivities. Book your accommodation well in advance — Midsommar week is the most popular vacation period in Sweden.',
    'A charming Midsommar tradition holds that if you pick seven different wildflowers in silence and place them under your pillow on Midsommar Eve, you\'ll dream of your future spouse. Whether or not you believe in the magic, spending a light-filled evening gathering wildflowers in the Swedish countryside is an experience you\'ll never forget.',
  ],
  'best-northern-lights-spots-scandinavia': [
    'The aurora borealis is one of nature\'s most spectacular displays, and Scandinavia offers some of the best front-row seats on Earth. The Northern Lights are visible from roughly September to March, with peak viewing between October and February when nights are darkest.',
    'Abisko in Swedish Lapland is consistently rated the best Northern Lights location in all of Scandinavia. The "blue hole of Abisko" — a microclimate phenomenon that keeps skies clear even when surrounding areas are cloudy — gives Abisko an unusually high success rate for sightings. The Aurora Sky Station on nearby Nuolja mountain offers guided viewing sessions.',
    'Norway\'s Tromsø, the "Gateway to the Arctic," is another premier location. At 69°N latitude, it sits perfectly within the auroral zone. The city offers the advantage of a vibrant cultural scene alongside Northern Lights chasing — you can dine on Arctic seafood, visit the iconic Arctic Cathedral, and join a guided aurora tour, all in one evening.',
    'Finnish Lapland, particularly the area around Inari and Muonio, offers the quintessential Northern Lights experience: a glass-roofed igloo or Aurora cabin where you can watch the lights dance overhead from the warmth of your bed. The Finnish Meteorological Institute provides excellent aurora forecasts.',
    'For the best photography, head away from city lights and find a composition with interesting foreground elements — a frozen lake, snow-covered trees, or a traditional Sami lavvu tent. Use a tripod, set your camera to manual mode (ISO 1600-3200, aperture f/2.8 or wider, 10-20 second exposure), and disable autofocus.',
    'Remember that the Northern Lights are a natural phenomenon and sightings cannot be guaranteed. Give yourself at least 3-4 nights in your chosen location to maximize your chances. And even if the aurora doesn\'t appear, the Arctic winter offers incredible experiences: dog sledding, snowmobile safaris, ice fishing, and Sami cultural encounters.',
  ],
  'swedish-stuga-culture-explained': [
    'The stuga (pronounced "stew-ga") is Sweden\'s national obsession. This simple countryside cabin — often painted the iconic Falu red with white trim — represents everything Swedes value most: nature, simplicity, and quality time with loved ones.',
    'Approximately half of all Swedish families own or have access to a stuga. These retreats range from basic one-room cabins without running water to more comfortable modern cottages, but the principle remains the same: escape the city, slow down, and reconnect with nature.',
    'The stuga tradition is deeply tied to Swedish concepts like "lagom" (just the right amount) and "friluftsliv" (open-air living). At a stuga, there\'s no schedule, no pressure, no over-complication. Days revolve around swimming, picking berries, reading, cooking simple meals, and sitting by the fire.',
    'If you\'re visiting a Swedish stuga, there are some customs to know. First, shoes come off at the door — always. Most stugas have a wood-burning sauna or at minimum a fireplace; learning to build and maintain a fire is part of the experience. "Fika" (coffee break with something sweet) happens multiple times daily and is practically sacred.',
    'The stuga season traditionally runs from Midsommar (late June) through August, though many Swedes use their cabins year-round. Winter stuga trips offer a completely different but equally magical experience: snowy forests, cross-country skiing from the doorstep, and long evenings by candlelight.',
  ],
  'first-time-renting-scandinavia': [
    'Renting a vacation property in Scandinavia is straightforward, but there are some cultural differences and practical details that can make the difference between a good trip and a great one. Here\'s what first-timers should know.',
    'Check-in and check-out times are sacred in Scandinavian rentals. Most properties have a strict changeover day (often Saturday) with check-in at 3-4 PM and check-out at 10-11 AM. This allows for thorough cleaning between guests. Arriving early or leaving late is considered quite rude and can cause real logistical problems for hosts.',
    'Many Scandinavian rentals expect you to do basic cleaning before departure — this is called "städning" (cleaning) in Swedish. This typically means doing the dishes, emptying the fridge, sweeping floors, and taking out trash. Bed linens may or may not be included; check your booking details. Some properties charge a separate linen fee.',
    'Grocery shopping works differently here. Stores close earlier than you might expect, especially in rural areas and on Sundays. Systembolaget (the state-run alcohol monopoly in Sweden) has limited hours and is closed on Sundays — plan your wine purchases accordingly. In Norway, alcohol regulations are even stricter.',
    'Pack layers regardless of the season. Nordic weather is famously unpredictable. Summers can swing between 28°C and 12°C within the same week. Waterproof layers, good walking shoes, and sunscreen (yes, even in winter — the snow reflects UV) are essentials. If you\'re visiting in summer, bring insect repellent for the mosquitoes, especially in northern regions.',
    'The "allemansrätten" (Right of Public Access) means you can walk, ski, and camp almost anywhere in Sweden and Norway, even on private land — as long as you don\'t disturb or damage anything. This right also extends to picking berries and mushrooms. It\'s a beautiful tradition of shared access to nature, and it means endless hiking and foraging opportunities right from your rental\'s doorstep.',
    'Tipping is not expected in Scandinavia. Service charges are included in prices, and workers are well-compensated. Rounding up at restaurants is appreciated but not necessary. Do not tip your rental host — a kind review is the best thank-you.',
  ],
  'sustainable-travel-nordic-countries': [
    'The Nordic countries are global leaders in sustainability, and traveling responsibly here is both easy and rewarding. From eco-certified accommodations to world-class public transport, Scandinavia makes it simple to minimize your environmental footprint.',
    'Choose eco-certified accommodations. Look for the Nordic Swan Ecolabel (Svanen) or the EU Ecolabel on hotels and rental properties. Many Swedish stugas are inherently sustainable — wood-heated, low-energy, and designed to work with nature rather than against it. Our platform highlights properties that meet sustainability criteria.',
    'Public transport in Scandinavia is excellent. Sweden\'s SJ trains connect all major cities, Norway\'s Hurtigruten coastal express is a destination in itself, and Finland\'s VR trains are comfortable and reliable. For local exploration, rent electric bikes (widely available) or use car-sharing services like Kinto (Toyota) or Volvo\'s M system.',
    'Eat locally and seasonally. Scandinavian cuisine is increasingly built around zero-km ingredients. Visit farmgate shops (gårdsbutiker), farmers\' markets, and "REKO-ring" local food pickup groups. The seafood in Scandinavia is among the most sustainably managed in the world — look for MSC-certified options.',
    'Practice "Leave No Trace" principles. The allemansrätten gives you incredible access to nature, but it comes with responsibility. Stay on marked trails in sensitive areas, don\'t light fires during dry periods (check local restrictions), and always carry out your waste. In popular areas like Lofoten, the environmental pressure from tourism is real — be part of the solution.',
    'Consider your travel timing. Visiting during shoulder season (May-June or September) reduces pressure on overcrowded summer destinations, often offers better value, and can provide equally beautiful (sometimes more beautiful) experiences. Autumn colors in Lapland, spring skiing in Norway, and the quiet before Midsommar are all spectacular.',
  ],
  'winter-activities-swedish-lapland': [
    'Swedish Lapland in winter is a wonderland of snow, ice, and ethereal Arctic light. Beyond the Northern Lights, the region offers a wealth of activities that make the cold not just bearable but genuinely magical.',
    'Dog sledding is the quintessential Lapland experience. Multi-day expeditions take you deep into the wilderness, camping in heated lavvu tents and cooking over open fires. Even a shorter half-day trip lets you feel the thrill of a husky team pulling you across a frozen landscape. Operators like Fjällräven and local Sami-run companies offer ethical, small-group experiences.',
    'The ICEHOTEL in Jukkasjärvi, rebuilt from scratch every winter since 1989, is more than a hotel — it\'s a gallery of ice art. Sleep on an ice bed (in a thermal sleeping bag; it\'s surprisingly warm), sip cocktails from ice glasses in the Absolut ice bar, and admire intricate ice sculptures. The year-round ICEHOTEL 365, kept frozen by solar power, is available even in summer.',
    'Ice fishing on a frozen lake is the most meditative of Lapland activities. Drill a hole, drop your line, and sit in the vast silence. Many operators combine ice fishing with a lakeside campfire lunch — cooking your catch over an open fire while surrounded by snowy forests is unforgettable.',
    'Snowmobile safaris offer an adrenaline-pumping way to cover vast distances through the frozen landscape. Multi-day tours can take you across frozen rivers, through primeval forests, and up into the mountains with panoramic Arctic views. Make sure to choose operators who use modern, lower-emission machines and follow marked trails.',
    'Cross-country skiing (längdskidåkning) is Sweden\'s national winter sport, and Lapland has endless groomed trails through stunning scenery. The Kungsleden (King\'s Trail) is skiable in winter for experienced backcountry skiers. For beginners, resort areas like Riksgränsen and Gällivare offer gentle trails with equipment rental.',
    'For something truly unique, try an overnight stay in a Sami lavvu (traditional tent). Several Sami-owned tourism operators offer immersive cultural experiences: reindeer herding, traditional joik (Sami singing) around the fire, and stories of life in the Arctic. These experiences directly support the indigenous Sami community and offer genuine cultural exchange.',
    'Don\'t forget the simple pleasure of a traditional Swedish fika in the snow. Many guided tours include a stop to brew coffee over a campfire and share homemade cinnamon buns (kanelbullar) while watching the pink Arctic twilight paint the sky. Sometimes the simplest moments are the most memorable.',
  ],
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  const content = slug ? BLOG_CONTENT[slug] : null;

  useSeoMeta(post ? {
    title: `${post.title} — Nordic Getaways Blog`,
    description: post.excerpt,
    canonical: `https://nordic-getaways.com/blog/${slug}`,
  } : {
    title: 'Post Not Found',
    description: 'The blog post you are looking for does not exist.',
  });

  if (!post || !content) {
    return (
      <div className="min-h-screen bg-background">
        <MainNavigation />
        <div className="container mx-auto px-4 pt-32 text-center">
          <h1 className="text-3xl font-bold mb-4">Post not found</h1>
          <Link to="/blog" className="text-primary hover:underline">
            Back to blog
          </Link>
        </div>
      </div>
    );
  }

  const postIndex = BLOG_POSTS.findIndex((p) => p.slug === slug);
  const prevPost = postIndex > 0 ? BLOG_POSTS[postIndex - 1] : null;
  const nextPost = postIndex < BLOG_POSTS.length - 1 ? BLOG_POSTS[postIndex + 1] : null;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    author: { '@type': 'Organization', name: 'Nordic Getaways' },
    publisher: {
      '@type': 'Organization',
      name: 'Nordic Getaways',
      url: 'https://nordic-getaways.com',
    },
    mainEntityOfPage: `https://nordic-getaways.com/blog/${post.slug}`,
  };

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://nordic-getaways.com' },
          { name: 'Blog', url: 'https://nordic-getaways.com/blog' },
          { name: post.title, url: `https://nordic-getaways.com/blog/${post.slug}` },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <MainNavigation />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#2D5F5D] to-[#1a3d3c] text-white pt-32 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 text-white/70 hover:text-white mb-6 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All Posts
          </Link>
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 mb-3">
            {post.category}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{post.title}</h1>
          <div className="flex items-center gap-4 text-sm text-white/60">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(post.publishedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {post.readTime}
            </span>
          </div>
        </div>
      </section>

      {/* Article content */}
      <main id="main-content" className="container mx-auto px-4 py-12 max-w-3xl">
        <article className="prose prose-lg max-w-none">
          {content.map((paragraph, i) => (
            <p key={i} className="text-muted-foreground leading-relaxed mb-6">
              {paragraph}
            </p>
          ))}
        </article>

        {/* Navigation between posts */}
        <div className="border-t mt-12 pt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {prevPost && (
            <Link
              to={`/blog/${prevPost.slug}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="line-clamp-1">{prevPost.title}</span>
            </Link>
          )}
          {nextPost && (
            <Link
              to={`/blog/${nextPost.slug}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors md:ml-auto md:text-right"
            >
              <span className="line-clamp-1">{nextPost.title}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* CTA */}
        <div className="bg-card border rounded-xl p-8 mt-12 text-center">
          <h2 className="text-xl font-bold mb-2">Ready to plan your Nordic getaway?</h2>
          <p className="text-muted-foreground mb-4">
            Browse our curated collection of vacation rentals across Scandinavia.
          </p>
          <Link
            to="/destinations"
            className="inline-block px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Explore Destinations
          </Link>
        </div>
      </main>
    </div>
  );
}

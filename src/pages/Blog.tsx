import { Link } from 'react-router-dom';
import MainNavigation from '@/components/MainNavigation';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { useSeoMeta } from '@/hooks/useSeoMeta';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  publishedAt: string;
  image?: string;
  author: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'ultimate-guide-midsommar-sweden',
    title: 'The Ultimate Guide to Midsommar in Sweden',
    excerpt:
      'Everything you need to know about celebrating Sweden\'s most beloved holiday — from maypole dances to herring feasts, and the best places to experience an authentic Midsommar.',
    category: 'Culture',
    readTime: '8 min read',
    publishedAt: '2026-03-10',
    author: 'Nordic Getaways',
  },
  {
    slug: 'best-northern-lights-spots-scandinavia',
    title: 'Best Northern Lights Spots in Scandinavia',
    excerpt:
      'A guide to the top aurora borealis viewing locations across Sweden, Norway, and Finland — with tips on timing, photography, and where to stay.',
    category: 'Travel Guide',
    readTime: '6 min read',
    publishedAt: '2026-02-20',
    author: 'Nordic Getaways',
  },
  {
    slug: 'swedish-stuga-culture-explained',
    title: 'Swedish Stuga Culture Explained',
    excerpt:
      'Why do Swedes escape to tiny cabins in the forest? An insider look at stuga culture, the traditions behind it, and how to experience it yourself.',
    category: 'Culture',
    readTime: '5 min read',
    publishedAt: '2026-02-05',
    author: 'Nordic Getaways',
  },
  {
    slug: 'first-time-renting-scandinavia',
    title: 'First Time Renting in Scandinavia? Read This.',
    excerpt:
      'Practical tips for first-time visitors — from understanding Swedish rental customs to packing lists, local etiquette, and how the booking process works.',
    category: 'Practical',
    readTime: '7 min read',
    publishedAt: '2026-01-15',
    author: 'Nordic Getaways',
  },
  {
    slug: 'sustainable-travel-nordic-countries',
    title: 'Sustainable Travel in the Nordic Countries',
    excerpt:
      'How to travel responsibly in Scandinavia — eco-friendly accommodations, public transport tips, and ways to minimize your environmental footprint.',
    category: 'Sustainability',
    readTime: '6 min read',
    publishedAt: '2025-12-28',
    author: 'Nordic Getaways',
  },
  {
    slug: 'winter-activities-swedish-lapland',
    title: '10 Winter Activities in Swedish Lapland',
    excerpt:
      'From dog sledding and ice fishing to staying in an ice hotel — the best winter experiences in Arctic Sweden that go beyond Northern Lights.',
    category: 'Activities',
    readTime: '5 min read',
    publishedAt: '2025-12-10',
    author: 'Nordic Getaways',
  },
];

const categoryColors: Record<string, string> = {
  Culture: 'bg-purple-100 text-purple-700',
  'Travel Guide': 'bg-blue-100 text-blue-700',
  Practical: 'bg-green-100 text-green-700',
  Sustainability: 'bg-emerald-100 text-emerald-700',
  Activities: 'bg-orange-100 text-orange-700',
};

export default function Blog() {
  useSeoMeta({
    title: 'Nordic Travel Blog & Guides',
    description:
      'Travel tips, cultural guides, and insider knowledge for your Nordic vacation. From Midsommar traditions to Northern Lights photography.',
    canonical: 'https://nordic-getaways.com/blog',
  });

  const featured = BLOG_POSTS[0];
  const rest = BLOG_POSTS.slice(1);

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://nordic-getaways.com' },
          { name: 'Blog', url: 'https://nordic-getaways.com/blog' },
        ]}
      />
      <MainNavigation />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#2D5F5D] to-[#1a3d3c] text-white pt-32 pb-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Nordic Travel Blog</h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Guides, tips, and stories to help you plan your perfect Scandinavian getaway.
          </p>
        </div>
      </section>

      <main id="main-content" className="container mx-auto px-4 py-16">
        {/* Featured post */}
        <Link
          to={`/blog/${featured.slug}`}
          className="group block rounded-xl overflow-hidden bg-card border shadow-sm hover:shadow-lg transition-all mb-12"
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="aspect-[16/10] md:aspect-auto bg-gradient-to-br from-[#2D5F5D]/20 to-[#2D5F5D]/5 flex items-center justify-center min-h-[240px]">
              <span className="text-6xl opacity-30">📝</span>
            </div>
            <div className="p-8 flex flex-col justify-center">
              <span
                className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium w-fit mb-3 ${categoryColors[featured.category] || 'bg-gray-100 text-gray-700'}`}
              >
                {featured.category}
              </span>
              <h2 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                {featured.title}
              </h2>
              <p className="text-muted-foreground mb-4">{featured.excerpt}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(featured.publishedAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {featured.readTime}
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Rest of posts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rest.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group block rounded-xl overflow-hidden bg-card border shadow-sm hover:shadow-lg transition-all"
            >
              <div className="aspect-[16/10] bg-gradient-to-br from-[#2D5F5D]/15 to-[#2D5F5D]/5 flex items-center justify-center">
                <span className="text-4xl opacity-20">📝</span>
              </div>
              <div className="p-5">
                <span
                  className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium mb-2 ${categoryColors[post.category] || 'bg-gray-100 text-gray-700'}`}
                >
                  {post.category}
                </span>
                <h2 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{post.excerpt}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.readTime}
                  </span>
                  <span className="flex items-center gap-1 text-primary group-hover:underline">
                    Read more <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

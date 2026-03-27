import type { Metadata } from 'next';
import BlogPostClient from './BlogPostClient';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return {
    title,
    description: `Read about ${title} — Nordic travel insights and vacation rental tips.`,
    openGraph: {
      title: `${title} | Nordic Getaways Blog`,
      description: `Read about ${title} — Nordic travel insights and vacation rental tips.`,
    },
  };
}

export default function BlogPostPage() {
  return <BlogPostClient />;
}

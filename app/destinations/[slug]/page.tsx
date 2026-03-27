import type { Metadata } from 'next';
import DestinationDetailClient from './DestinationDetailClient';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return {
    title,
    description: `Discover ${title} — a stunning Nordic destination for your next vacation rental.`,
    openGraph: {
      title: `${title} | Nordic Getaways`,
      description: `Discover ${title} — a stunning Nordic destination for your next vacation rental.`,
    },
  };
}

export default function DestinationDetailPage() {
  return <DestinationDetailClient />;
}

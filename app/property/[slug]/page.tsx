import type { Metadata } from 'next';
import PropertyPageClient from './PropertyPageClient';

export const metadata: Metadata = {
  title: 'Property Details',
  description: 'View property details and book your Nordic getaway.',
};

export default function PropertyPage({ params }: { params: { slug: string } }) {
  return <PropertyPageClient slug={params.slug} />;
}

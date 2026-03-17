import type { Metadata } from 'next';
import AmenitiesClient from './AmenitiesClient';

export const metadata: Metadata = {
  title: 'Amenities',
  description: 'Explore the premium amenities available at our Nordic vacation properties.',
  openGraph: {
    title: 'Amenities | Nordic Getaways',
    description: 'Explore the premium amenities available at our Nordic vacation properties.',
  },
};

export default function AmenitiesPage() {
  return <AmenitiesClient />;
}

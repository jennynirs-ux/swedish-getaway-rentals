import type { Metadata } from 'next';
import DestinationsClient from './DestinationsClient';

export const metadata: Metadata = {
  title: 'Destinations',
  description: 'Explore stunning Nordic destinations for your next vacation. From the Stockholm Archipelago to Swedish Lapland.',
  openGraph: {
    title: 'Destinations | Nordic Getaways',
    description: 'Explore stunning Nordic destinations for your next vacation.',
  },
};

export default function DestinationsPage() {
  return <DestinationsClient />;
}

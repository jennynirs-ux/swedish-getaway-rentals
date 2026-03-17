import type { Metadata } from 'next';
import PricingGuideClient from './PricingGuideClient';

export const metadata: Metadata = {
  title: 'Pricing Guide',
  description: 'Transparent pricing information for Nordic Getaways vacation rentals.',
  openGraph: {
    title: 'Pricing Guide | Nordic Getaways',
    description: 'Transparent pricing information for Nordic Getaways vacation rentals.',
  },
};

export default function PricingGuidePage() {
  return <PricingGuideClient />;
}

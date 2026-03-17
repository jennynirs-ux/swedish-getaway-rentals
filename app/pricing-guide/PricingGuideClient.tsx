'use client';
import dynamic from 'next/dynamic';

const PricingGuide = dynamic(() => import('@/pages/PricingGuide'), { ssr: false });

export default function PricingGuideClient() {
  return <PricingGuide />;
}

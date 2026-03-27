'use client';
import dynamic from 'next/dynamic';

const PricingGuide = dynamic(() => import('@/pages/PricingGuide'), { ssr: true, loading: () => <div className="min-h-screen animate-pulse bg-muted/20" /> });

export default function PricingGuideClient() {
  return <PricingGuide />;
}

'use client';
import dynamic from 'next/dynamic';

const Destinations = dynamic(() => import('@/pages/Destinations'), { ssr: true, loading: () => <div className="min-h-screen animate-pulse bg-muted/20" /> });

export default function DestinationsClient() {
  return <Destinations />;
}

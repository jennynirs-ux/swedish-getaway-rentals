'use client';
import dynamic from 'next/dynamic';

const DestinationDetail = dynamic(() => import('@/pages/DestinationDetail'), { ssr: true, loading: () => <div className="min-h-screen animate-pulse bg-muted/20" /> });

export default function DestinationDetailClient() {
  return <DestinationDetail />;
}

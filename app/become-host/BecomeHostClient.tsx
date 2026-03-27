'use client';
import dynamic from 'next/dynamic';

const BecomeHost = dynamic(() => import('@/pages/BecomeHost'), { ssr: true, loading: () => <div className="min-h-screen animate-pulse bg-muted/20" /> });

export default function BecomeHostClient() {
  return <BecomeHost />;
}

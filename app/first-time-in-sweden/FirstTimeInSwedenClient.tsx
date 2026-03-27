'use client';
import dynamic from 'next/dynamic';

const FirstTimeInSweden = dynamic(() => import('@/pages/FirstTimeInSweden'), { ssr: true, loading: () => <div className="min-h-screen animate-pulse bg-muted/20" /> });

export default function FirstTimeInSwedenClient() {
  return <FirstTimeInSweden />;
}

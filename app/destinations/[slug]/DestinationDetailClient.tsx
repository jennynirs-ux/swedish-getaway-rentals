'use client';
import dynamic from 'next/dynamic';

const DestinationDetail = dynamic(() => import('@/pages/DestinationDetail'), { ssr: false });

export default function DestinationDetailClient() {
  return <DestinationDetail />;
}

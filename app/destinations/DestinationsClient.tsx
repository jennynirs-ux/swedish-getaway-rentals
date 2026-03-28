'use client';
import dynamic from 'next/dynamic';

const Destinations = dynamic(() => import('@/pages/Destinations'), { ssr: false });

export default function DestinationsClient() {
  return <Destinations />;
}

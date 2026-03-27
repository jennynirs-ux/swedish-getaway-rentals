'use client';
import dynamic from 'next/dynamic';

const Amenities = dynamic(() => import('@/pages/Amenities'), { ssr: true, loading: () => <div className="min-h-screen animate-pulse bg-muted/20" /> });

export default function AmenitiesClient() {
  return <Amenities />;
}

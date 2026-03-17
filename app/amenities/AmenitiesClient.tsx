'use client';
import dynamic from 'next/dynamic';

const Amenities = dynamic(() => import('@/pages/Amenities'), { ssr: false });

export default function AmenitiesClient() {
  return <Amenities />;
}

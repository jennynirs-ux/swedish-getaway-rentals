'use client';
import dynamic from 'next/dynamic';

const PropertyGuide = dynamic(() => import('@/pages/PropertyGuide'), { ssr: false });

export default function GuideClient() {
  return <PropertyGuide />;
}

'use client';
import dynamic from 'next/dynamic';

const BecomeHost = dynamic(() => import('@/pages/BecomeHost'), { ssr: false });

export default function BecomeHostClient() {
  return <BecomeHost />;
}

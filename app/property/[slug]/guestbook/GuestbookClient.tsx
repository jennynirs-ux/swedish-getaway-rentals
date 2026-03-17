'use client';
import dynamic from 'next/dynamic';

const PropertyGuestbookPage = dynamic(() => import('@/pages/PropertyGuestbookPage'), { ssr: false });

export default function GuestbookClient() {
  return <PropertyGuestbookPage />;
}

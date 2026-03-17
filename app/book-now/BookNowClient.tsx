'use client';
import dynamic from 'next/dynamic';

const BookNow = dynamic(() => import('@/pages/BookNow'), { ssr: false });

export default function BookNowClient() {
  return <BookNow />;
}

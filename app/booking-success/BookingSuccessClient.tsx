'use client';
import dynamic from 'next/dynamic';

const BookingSuccess = dynamic(() => import('@/pages/BookingSuccess'), { ssr: false });

export default function BookingSuccessClient() {
  return <BookingSuccess />;
}

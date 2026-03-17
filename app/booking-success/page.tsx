import type { Metadata } from 'next';
import BookingSuccessClient from './BookingSuccessClient';

export const metadata: Metadata = {
  title: 'Booking Confirmed',
  description: 'Your Nordic getaway booking has been confirmed.',
  robots: { index: false, follow: false },
};

export default function BookingSuccessPage() {
  return <BookingSuccessClient />;
}

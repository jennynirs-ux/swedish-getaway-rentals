import type { Metadata } from 'next';
import BookNowClient from './BookNowClient';

export const metadata: Metadata = {
  title: 'Book Now',
  description: 'Complete your reservation for a Nordic getaway.',
};

export default function BookNowPage() {
  return <BookNowClient />;
}

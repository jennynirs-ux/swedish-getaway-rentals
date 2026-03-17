import type { Metadata } from 'next';
import OrderSuccessClient from './OrderSuccessClient';

export const metadata: Metadata = {
  title: 'Order Confirmed',
  description: 'Your Nordic Collection order has been confirmed.',
  robots: { index: false, follow: false },
};

export default function OrderSuccessPage() {
  return <OrderSuccessClient />;
}

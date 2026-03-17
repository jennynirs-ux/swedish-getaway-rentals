import type { Metadata } from 'next';
import CartClient from './CartClient';

export const metadata: Metadata = {
  title: 'Shopping Cart',
  description: 'Review your Nordic Collection items before checkout.',
};

export default function CartPage() {
  return <CartClient />;
}

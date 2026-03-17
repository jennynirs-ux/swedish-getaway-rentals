'use client';
import dynamic from 'next/dynamic';

const Cart = dynamic(() => import('@/pages/Cart'), { ssr: false });

export default function CartClient() {
  return <Cart />;
}

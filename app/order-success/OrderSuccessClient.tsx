'use client';
import dynamic from 'next/dynamic';

const OrderSuccess = dynamic(() => import('@/pages/OrderSuccess'), { ssr: false });

export default function OrderSuccessClient() {
  return <OrderSuccess />;
}

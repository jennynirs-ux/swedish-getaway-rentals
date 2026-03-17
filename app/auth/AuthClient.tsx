'use client';
import dynamic from 'next/dynamic';

const Auth = dynamic(() => import('@/pages/Auth'), { ssr: false });

export default function AuthClient() {
  return <Auth />;
}

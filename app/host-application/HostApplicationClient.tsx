'use client';
import dynamic from 'next/dynamic';

const HostApplication = dynamic(() => import('@/pages/HostApplication'), { ssr: false });

export default function HostApplicationClient() {
  return <HostApplication />;
}

'use client';
import dynamic from 'next/dynamic';

const FirstTimeInSweden = dynamic(() => import('@/pages/FirstTimeInSweden'), { ssr: false });

export default function FirstTimeInSwedenClient() {
  return <FirstTimeInSweden />;
}

'use client';
import dynamic from 'next/dynamic';

const Contact = dynamic(() => import('@/pages/Contact'), { ssr: true, loading: () => <div className="min-h-screen animate-pulse bg-muted/20" /> });

export default function ContactClient() {
  return <Contact />;
}

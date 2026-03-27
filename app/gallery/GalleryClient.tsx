'use client';
import dynamic from 'next/dynamic';

const Gallery = dynamic(() => import('@/pages/Gallery'), { ssr: true, loading: () => <div className="min-h-screen animate-pulse bg-muted/20" /> });

export default function GalleryClient() {
  return <Gallery />;
}

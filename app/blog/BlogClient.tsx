'use client';
import dynamic from 'next/dynamic';

const Blog = dynamic(() => import('@/pages/Blog'), { ssr: true, loading: () => <div className="min-h-screen animate-pulse bg-muted/20" /> });

export default function BlogClient() {
  return <Blog />;
}

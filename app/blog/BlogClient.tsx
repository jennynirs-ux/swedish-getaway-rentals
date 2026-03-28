'use client';
import dynamic from 'next/dynamic';

const Blog = dynamic(() => import('@/pages/Blog'), { ssr: false });

export default function BlogClient() {
  return <Blog />;
}

import type { Metadata } from 'next';
import GalleryClient from './GalleryClient';

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'Browse photos of our stunning Nordic vacation properties and surroundings.',
  openGraph: {
    title: 'Gallery | Nordic Getaways',
    description: 'Browse photos of our stunning Nordic vacation properties and surroundings.',
  },
};

export default function GalleryPage() {
  return <GalleryClient />;
}

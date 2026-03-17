import type { Metadata } from 'next';
import GuestbookClient from './GuestbookClient';

export const metadata: Metadata = {
  title: 'Guest Book',
  description: 'Read and leave messages in our property guestbook.',
};

export default function GuestbookPage() {
  return <GuestbookClient />;
}

import type { Metadata } from 'next';
import CleaningCompleteClient from './CleaningCompleteClient';

export const metadata: Metadata = {
  title: 'Complete Cleaning Task',
  description: 'Mark your cleaning task as complete.',
  robots: { index: false, follow: false },
};

export default function CleaningCompletePage() {
  return <CleaningCompleteClient />;
}

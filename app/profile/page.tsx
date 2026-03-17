import type { Metadata } from 'next';
import ProfileClient from './ProfileClient';

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'View your bookings, favorites, and account settings.',
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <ProfileClient />;
}

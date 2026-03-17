import type { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Nordic Getaways for booking inquiries and support.',
  openGraph: {
    title: 'Contact | Nordic Getaways',
    description: 'Get in touch with Nordic Getaways for booking inquiries and support.',
  },
};

export default function ContactPage() {
  return <ContactClient />;
}

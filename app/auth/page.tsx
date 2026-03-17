import type { Metadata } from 'next';
import AuthClient from './AuthClient';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in or create an account to book your Nordic getaway.',
};

export default function AuthPage() {
  return <AuthClient />;
}

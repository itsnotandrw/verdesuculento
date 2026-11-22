import type { Metadata } from 'next';
import { env } from '@/lib/env';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Ingresar · Panel',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  return <LoginForm google={Boolean(env.googleClientId && env.googleClientSecret)} />;
}

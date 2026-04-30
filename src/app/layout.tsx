import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Nav } from '@/components/Nav';
import { getProfile } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'TourneyPal',
  description: 'Pickleball league scoreboard, profiles, chat',
};

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} bg-dark-bg text-slate-50`}>
        <Nav profile={profile} />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import { THEME_BOOT_SCRIPT } from './theme-boot';

export const metadata: Metadata = {
  title: 'Procurement Management System',
  description: 'DP(Navy) procurement workflow',
  robots: 'noindex, nofollow',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* No-flash theme boot: sets data-theme before paint, before React mounts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

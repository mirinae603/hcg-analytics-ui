import './globals.css';

import type { Metadata } from 'next';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { RegionProvider } from '@/context/RegionContext'; // ✅ import your new RegionProvider
import GlobalLoader from '@/components/common/GlobalLoader';

// Every route in the product shipped with NO browser tab title — browsers fell back to
// the bare URL, so a user with the dashboard open in several tabs could not tell them
// apart. The only two pages that did set one (signin, signup) announced "BidEasy
// Analytics AI", which is the vendor's product name on a deliverable badged HCG
// Hospitals throughout. The template here gives every page a real title and keeps the
// client's name first; pages that want their own set `title` and it fills the %s.
export const metadata: Metadata = {
  title: {
    default: 'HCG Hospitals · Supply Chain Analytics',
    template: '%s · HCG Supply Chain Analytics',
  },
  description: 'Inventory, consumption, procurement and demand-forecasting analytics for HCG Hospitals.',
};

// Outfit is loaded via a runtime stylesheet link (not next/font's build-time fetch)
// so the production build never depends on reaching Google Fonts. Same font, same look.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="dark:bg-gray-900"
        style={{ fontFamily: "'Outfit', system-ui, -apple-system, 'Segoe UI', sans-serif" }}
      >
        <GlobalLoader />
        <ThemeProvider>
          <SidebarProvider>
            <RegionProvider>
              {children}
            </RegionProvider>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

import './globals.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { RegionProvider } from '@/context/RegionContext'; // ✅ import your new RegionProvider

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

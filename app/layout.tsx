import type { Metadata } from 'next';
import { Toaster } from 'sonner';

import { ThemeProvider } from '@/components/theme-provider';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://oakbay.ca'),
  title: 'Oak Bay Bylaws Assistant',
  description:
    'AI-powered assistant for Oak Bay municipal bylaws, providing accurate search, citation, and interpretation for citizens and staff.',
  authors: [{ name: 'Oak Bay Municipality' }],
  keywords: [
    'Bylaw Search',
    'Municipal Bylaws',
    'Oak Bay',
    'Bylaw Assistant',
    'Municipal Regulations',
    'Document Search',
  ],
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Disable auto-zoom on mobile Safari
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'hsl(0 0% 100%)' },
    { media: '(prefers-color-scheme: dark)', color: 'hsl(222 47% 11%)' },
  ],
};

// Updated theme colors based on our new palette
const LIGHT_THEME_COLOR = 'hsl(0 0% 100%)';
const DARK_THEME_COLOR = 'hsl(222 47% 11%)';
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

// Initialize optimizations at application startup
import { initializeOptimizations } from '@/lib/optimization';

// This initializes optimizations only in production or when explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_OPTIMIZATIONS === 'true') {
  initializeOptimizations().catch(console.error);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // `next-themes` injects an extra classname to the body element to avoid
      // visual flicker before hydration. Hence the `suppressHydrationWarning`
      // prop is necessary to avoid the React hydration mismatch warning.
      // https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: '1px solid hsl(var(--border))',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              },
              className: 'text-sm font-medium',
            }}
          />
          <div className="grid min-h-screen">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}

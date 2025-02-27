import type { Metadata } from 'next';
import { Toaster } from 'sonner';

import { ThemeProvider } from '@/components/theme-provider';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://chat.vercel.ai'),
  title: 'FebChat - Smart Conversational Platform',
  description: 'Advanced AI-powered chat platform with document analysis, bylaw search, and artifact management.',
  authors: [{ name: 'FebChat Team' }],
  keywords: ['AI Chat', 'Document Analysis', 'Bylaw Search', 'AI Assistant'],
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
      <body className="antialiased min-h-screen bg-background text-foreground">
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
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
              },
              className: 'text-sm font-medium',
              success: {
                style: {
                  border: '1px solid hsl(var(--success) / 0.3)',
                }
              },
              error: {
                style: {
                  border: '1px solid hsl(var(--destructive) / 0.3)',
                }
              },
            }}
          />
          <div className="grid min-h-screen">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

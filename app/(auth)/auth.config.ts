import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
    newUser: '/',
    error: '/auth-error', // Add a custom error page
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  session: {
    // Use JWT strategy with strong settings
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours instead of 30 days for better security
    updateAge: 60 * 60, // 1 hour - force session refresh
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      // Define protected and public paths more clearly
      const isPublicApi = nextUrl.pathname.startsWith('/api/public');
      const isApiRoute = nextUrl.pathname.startsWith('/api');
      const isAuthRoute =
        nextUrl.pathname.startsWith('/login') ||
        nextUrl.pathname.startsWith('/register') ||
        nextUrl.pathname.startsWith('/auth-error');
      const isStaticAsset = nextUrl.pathname.match(
        /\.(jpg|jpeg|png|gif|svg|css|js)$/,
      );
      const isProtectedRoute = !isAuthRoute && !isPublicApi && !isStaticAsset;

      // Static assets and public API endpoints are always accessible
      if (isStaticAsset || isPublicApi) {
        return true;
      }

      // Redirect authenticated users away from auth pages
      if (isLoggedIn && isAuthRoute) {
        return Response.redirect(new URL('/', nextUrl));
      }

      // Allow access to auth routes for everyone
      if (isAuthRoute) {
        return true;
      }

      // API routes require authentication unless marked as public
      if (isApiRoute) {
        return isLoggedIn;
      }

      // All other routes require authentication
      if (isProtectedRoute) {
        return isLoggedIn;
      }

      // Default to requiring authentication for safety
      return isLoggedIn;
    },
    // Add JWT enhancement for better security
    jwt({ token, user }) {
      if (user) {
        // Add user ID to token
        token.id = user.id;
        // Add a timestamp for when the token was created
        token.iat = Math.floor(Date.now() / 1000);
      }
      return token;
    },
  },
  // Enhance security headers
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
} satisfies NextAuthConfig;

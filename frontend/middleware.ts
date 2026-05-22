import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Whitelist login, static assets, and api routes from redirect checks
  const isLoginPage = pathname === '/login';
  const isAuthCallback = pathname.startsWith('/auth/callback');
  const isStaticAsset = 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/favicon.ico') || 
    pathname.startsWith('/api') || 
    pathname.includes('.');

  if (isStaticAsset || isAuthCallback) {
    return NextResponse.next();
  }

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (isDemoMode) {
    const hasDemoCookie = request.cookies.has('demo-auth-active');
    
    if (hasDemoCookie) {
      if (isLoginPage) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      return NextResponse.next();
    } else {
      if (!isLoginPage) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      return NextResponse.next();
    }
  }

  // Django session-based authentication validation check
  const hasSessionCookie = request.cookies.has('sessionid');

  if (hasSessionCookie) {
    if (isLoginPage) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  } else {
    if (!isLoginPage) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

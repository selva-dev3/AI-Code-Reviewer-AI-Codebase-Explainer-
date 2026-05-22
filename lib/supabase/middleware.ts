import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '../env';

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Whitelist login, static assets, and api routes from redirect checks
  const isLoginPage = pathname === '/login';
  const isAuthCallback = pathname.startsWith('/auth/callback');
  const isStaticAsset = 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/favicon.ico') || 
    pathname.startsWith('/api') || 
    pathname.includes('.');

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  if (isStaticAsset || isAuthCallback) {
    return response;
  }

  // 1. DEMO MODE PATHWAY
  if (env.NEXT_PUBLIC_DEMO_MODE) {
    const hasDemoCookie = request.cookies.has('demo-auth-active');
    
    if (hasDemoCookie) {
      if (isLoginPage) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      return response;
    } else {
      if (!isLoginPage) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      return response;
    }
  }

  // 2. PRODUCTION SUPABASE AUTH PATHWAY
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co',
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    if (isLoginPage) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  } else {
    if (!isLoginPage) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return response;
}

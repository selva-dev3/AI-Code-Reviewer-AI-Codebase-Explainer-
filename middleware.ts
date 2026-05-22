import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/middleware';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/lib/env';

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

  // Get the base response initialized with supabase cookie setAll/getAll helpers
  let response = createClient(request);

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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
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

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

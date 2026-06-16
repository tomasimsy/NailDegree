import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Allow public files to pass through without authentication
  const publicPaths = ['/manifest.json', '/sw.js', '/icons/', '/screenshots/', '/favicon.ico'];
  if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // If you have authentication logic, add it here.
  // For example, if you use Supabase, you might check for a session.
  // But for now, just allow everything (or add your auth logic below).
  return NextResponse.next();
}

// Configure the matcher to run on all routes except static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - manifest.json (PWA manifest)
     * - sw.js (service worker)
     * - icons/ (icon folder)
     * - screenshots/ (screenshot folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|screenshots/).*)',
  ],
};
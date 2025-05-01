import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const path = request.nextUrl.pathname;
  
  // Define public paths that don't require authentication
  const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
  
  // Check if the path is public
  const isPublicPath = publicPaths.some(publicPath => 
    path === publicPath || path.startsWith('/api/') || path.startsWith('/_next/')
  );
  
  // If the path is public, allow access
  if (isPublicPath) {
    // If user is already logged in and trying to access login/register pages, redirect to dashboard
    if (token && (path === '/login' || path === '/register')) {
      try {
        // Verify token is valid
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        
        if (decoded.exp && decoded.exp > currentTime) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      } catch (error) {
        // If token is invalid, allow access to login/register
        return NextResponse.next();
      }
    }
    
    return NextResponse.next();
  }
  
  // If the path requires authentication, check for token
  if (!token) {
    // Redirect to login page if no token
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  try {
    // Verify token is valid
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    
    if (decoded.exp && decoded.exp < currentTime) {
      // Token is expired, redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Token is valid, allow access
    return NextResponse.next();
  } catch (error) {
    // Token is invalid, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
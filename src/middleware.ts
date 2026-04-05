import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Only protect /dashboard and its sub-paths, BUT ignore /dashboard/login
    const isDashboardPath = request.nextUrl.pathname.startsWith('/dashboard');
    const isLoginPage = request.nextUrl.pathname === '/dashboard/login';

    if (isDashboardPath && !isLoginPage) {
        const authCookie = request.cookies.get('dashboard_auth');

        // If the cookie is not present or invalid, redirect to login
        if (!authCookie || authCookie.value !== 'authenticated') {
            const loginUrl = new URL('/dashboard/login', request.url);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: '/dashboard/:path*',
};

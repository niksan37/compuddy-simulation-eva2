import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { password } = body;

        // In a real app, use environment variables to store this password.
        // e.g., const correctPassword = process.env.DASHBOARD_PASSWORD;
        const correctPassword = process.env.DASHBOARD_PASSWORD || 'your_secure_password';

        if (password === correctPassword) {
            // Set a secure, HTTP-only cookie
            const response = NextResponse.json({ success: true });

            // Cookie valid for 24 hours
            response.cookies.set({
                name: 'dashboard_auth',
                value: 'authenticated',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24,
                path: '/',
            });

            return response;
        }

        return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: 'Bad request' }, { status: 400 });
    }
}

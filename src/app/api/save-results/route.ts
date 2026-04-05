import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Extract prolificId and keep the rest as data
        const { prolificId, ...data } = body;

        // Insert into Supabase
        const { error } = await supabase
            .from('experiment_results')
            .insert({
                prolific_id: prolificId || 'anonymous',
                data: data
            });

        if (error) {
            console.error('Supabase Insert Error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

import { supabase } from '@/lib/supabaseClient';
import DashboardClient from '@/components/DashboardClient';

// Ensure this page is always dynamically rendered to fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
    // Fetch data from Supabase securely on the server
    const { data: results, error } = await supabase
        .from('experiment_results')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching results:", error);
        return (
            <div className="flex h-screen items-center justify-center p-4">
                <div className="bg-red-50 text-red-800 p-6 rounded-lg shadow-sm border border-red-200">
                    <h2 className="text-xl font-bold mb-2">Error Loading Data</h2>
                    <p>{error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* The client component handles the interactivity (search, modal/alert) */}
            <DashboardClient initialResults={results || []} />
        </div>
    );
}

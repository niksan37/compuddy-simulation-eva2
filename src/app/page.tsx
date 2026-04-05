import React, { Suspense } from 'react';
import ExperimentManager from '@/components/ExperimentManager';

export default function Home() {
  return (
    <main className="h-screen overflow-y-auto bg-gray-50 text-gray-900 font-sans">
      <Suspense fallback={<div className="flex h-screen items-center justify-center p-8">Loading Experiment Framework...</div>}>
        <ExperimentManager />
      </Suspense>
    </main>
  );
}

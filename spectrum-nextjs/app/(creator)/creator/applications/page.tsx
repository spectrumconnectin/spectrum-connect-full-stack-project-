'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ApplicationsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/creator/projects?tab=applications');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Redirecting to My Work…</p>
    </div>
  );
}

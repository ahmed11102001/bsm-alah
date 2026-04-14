'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // إذا مش مسجل دخول، روح للـ home
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  // بينما يتحقق من الـ session
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // إذا مش مسجل، ما تعرض شيء
  if (!session) {
    return null;
  }

  return <>{children}</>;
}

import { useAuth } from '@/context';
import Sidebar from './Sidebar';
import Header from './Header';
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export default function DashboardLayout({ children, allowedRoles }: DashboardLayoutProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[#f7f7f5]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 md:px-6 md:py-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
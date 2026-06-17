import { useAuth } from '@/context';
import DashboardLayout from '@/components/feature/DashboardLayout';
import StatCard from '@/components/base/StatCard';
import InspectionChart from './components/InspectionChart';
import UpcomingInspections from './components/UpcomingInspections';
import ComplianceWidget from './components/ComplianceWidget';
import RecentActivity from './components/RecentActivity';
import PriorityAssets from './components/PriorityAssets';
import MyInspections from './components/MyInspections';
import NeedsScheduling from './components/NeedsScheduling';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function Home() {
  const { user } = useAuth();
  const data = useDashboardData();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (data.loading) {
    return (
      <DashboardLayout>
        <div className="max-w-[1400px] mx-auto flex items-center justify-center h-64">
          <i className="ri-loader-4-line animate-spin text-3xl text-brand-gold"></i>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {greeting()}, {user?.fullName?.split(' ')[0]}
          </h2>
          <p className="text-sm text-gray-500 mt-1">Here's what's happening with your inspections today.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Assets"
            value={data.totalAssets}
            change={`${data.activeAssets} active`}
            changeType="up"
            icon="ri-tools-line"
            iconBg="bg-brand-navy/8"
            iconColor="text-brand-navy"
          />
          <StatCard
            label="Inspections This Month"
            value={data.inspectionsThisMonth}
            change={`${data.inspectionsCompleted} completed`}
            changeType="up"
            icon="ri-clipboard-line"
            iconBg="bg-brand-cyan/15"
            iconColor="text-brand-cyan"
          />
          <StatCard
            label="Compliance Rate"
            value={`${data.complianceRate}%`}
            change="Based on completed"
            changeType="up"
            icon="ri-shield-check-line"
            iconBg="bg-brand-gold/15"
            iconColor="text-brand-gold"
          />
          <StatCard
            label="Overdue"
            value={data.inspectionsOverdue}
            change="Needs attention"
            changeType="down"
            icon="ri-error-warning-line"
            iconBg="bg-red-50"
            iconColor="text-red-500"
          />
        </div>

        {/* Needs Scheduling — only for admin/manager */}
        {user?.role !== 'technician' && data.needsScheduling && data.needsScheduling.length > 0 && (
          <div className="mb-6">
            <NeedsScheduling items={data.needsScheduling} onScheduled={() => window.location.reload()} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2">
            <MyInspections inspections={data.myInspections} />
          </div>
          <div>
            <UpcomingInspections inspections={data.upcomingInspections} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <InspectionChart data={data.monthlyInspections} />
          </div>
          <div className="lg:col-span-1">

            <ComplianceWidget categories={data.complianceByCategory} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">


          <div>
            <PriorityAssets assets={data.priorityAssets} />
          </div>
          <div>
            <RecentActivity activities={data.recentActivity} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
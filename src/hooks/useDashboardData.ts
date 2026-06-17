import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context';

export interface DashboardData {
  totalAssets: number;
  activeAssets: number;
  inspectionsThisMonth: number;
  inspectionsCompleted: number;
  inspectionsOverdue: number;
  complianceRate: number;
  monthlyInspections: { month: string; completed: number; scheduled: number }[];
  complianceByCategory: { name: string; rate: number; total: number }[];
  upcomingInspections: any[];
  recentActivity: any[];
  priorityAssets: any[];
  myInspections: any[];
  needsScheduling: any[];
  loading: boolean;
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    totalAssets: 0, activeAssets: 0, inspectionsThisMonth: 0,
    inspectionsCompleted: 0, inspectionsOverdue: 0, complianceRate: 0,
    monthlyInspections: [], complianceByCategory: [],
    upcomingInspections: [], recentActivity: [], priorityAssets: [], myInspections: [],
    needsScheduling: [],
    loading: true,
  });

  useEffect(() => {
    async function fetchAll() {
      try {
        // For technicians, scope all queries to only their assigned inspections
        let inspQuery = supabase.from('inspections').select('*');
        if (user?.role === 'technician') {
          inspQuery = inspQuery.eq('inspector_id', user.id);
        }

        const [
          { data: assets, error: assetsErr },
          { data: inspections, error: inspErr },
          { data: profiles, error: profErr },
        ] = await Promise.all([
          supabase.from('assets').select('*'),
          inspQuery,
          supabase.from('profiles').select('*'),
        ]);

        if (assetsErr || inspErr || profErr) {
          // Fall back to mock data
          const { dashboardStats, monthlyInspections, complianceByCategory, upcomingInspections, recentActivity, priorityAssets } = await import('@/mocks/dashboard');

          let filteredUpcoming = upcomingInspections;
          let filteredMyInspections: any[] = [];
          let filteredRecent = recentActivity;
          let filteredStats = { ...dashboardStats };
          let filteredCompliance = complianceByCategory;

          if (user?.role === 'technician') {
            filteredUpcoming = upcomingInspections.filter((i: any) => i.assignee === user?.fullName);
            filteredMyInspections = filteredUpcoming.map((i: any) => ({
              id: i.id, asset: i.asset, location: i.location, type: i.type,
              scheduledDate: i.date, completedDate: null, status: 'scheduled', rating: null, findings: '',
            }));
            filteredRecent = recentActivity.filter((a: any) => a.user === user?.fullName);
            filteredStats = {
              ...dashboardStats,
              totalAssets: filteredUpcoming.length,
              activeAssets: filteredUpcoming.length,
              inspectionsThisMonth: filteredUpcoming.length,
              inspectionsCompleted: 0,
              inspectionsOverdue: 0,
              complianceRate: 0,
            };
            filteredCompliance = [];
          } else {
            filteredMyInspections = upcomingInspections
              .filter((i: any) => i.assignee === user?.fullName)
              .map((i: any) => ({
                id: i.id, asset: i.asset, location: i.location, type: i.type,
                scheduledDate: i.date, completedDate: null, status: 'scheduled', rating: null, findings: '',
              }));
          }

          setData({
            ...filteredStats,
            activeAssets: filteredStats.activeAssets,
            monthlyInspections,
            complianceByCategory: filteredCompliance,
            upcomingInspections: filteredUpcoming,
            recentActivity: filteredRecent,
            priorityAssets: filteredUpcoming.slice(0, 4).map((i: any) => ({
              id: i.id, name: i.asset, type: 'N/A', location: i.location,
              status: i.priority === 'high' ? 'Overdue' : 'Upcoming', daysOverdue: 0,
            })),
            myInspections: filteredMyInspections,
            needsScheduling: [],
            loading: false,
          });
          return;
        }

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Get the set of asset IDs relevant to this technician
        const relevantAssetIds = new Set((inspections || []).map((i: any) => i.asset_id));
        const relevantAssets = (assets || []).filter((a: any) => relevantAssetIds.has(a.id));

        // Stats — scoped to technician's inspections
        const totalAssets = user?.role === 'technician' ? relevantAssetIds.size : (assets?.length || 0);
        const activeAssets = user?.role === 'technician'
          ? relevantAssets.filter((a: any) => a.status === 'active').length
          : (assets?.filter((a: any) => a.status === 'active').length || 0);
        const monthInspections = (inspections || []).filter((i: any) => {
          const d = new Date(i.scheduled_date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        const completedThisMonth = monthInspections.filter((i: any) => i.status === 'completed').length;
        const overdue = (inspections || []).filter((i: any) => i.status === 'overdue').length;

        const totalCompleted = (inspections || []).filter((i: any) => i.status === 'completed').length;
        const totalPassed = (inspections || []).filter((i: any) => i.rating === 'pass').length;
        const complianceRate = totalCompleted > 0 ? Math.round((totalPassed / totalCompleted) * 100) : 0;

        // Monthly chart data — scoped to tech's inspections
        const monthlyData = monthNames.map((month, idx) => {
          const monthInsp = (inspections || []).filter((i: any) => {
            const d = new Date(i.scheduled_date);
            return d.getMonth() === idx && d.getFullYear() === currentYear;
          });
          return {
            month,
            completed: monthInsp.filter((i: any) => i.status === 'completed').length,
            scheduled: monthInsp.length,
          };
        });

        // Compliance by category — scoped
        const assetTypeMap: Record<string, string> = {};
        (user?.role === 'technician' ? relevantAssets : (assets || [])).forEach((a: any) => {
          assetTypeMap[a.id] = a.type;
        });
        const categoryMap: Record<string, { total: number; passed: number }> = {};
        (inspections || []).forEach((i: any) => {
          const type = assetTypeMap[i.asset_id] || 'Other';
          if (!categoryMap[type]) categoryMap[type] = { total: 0, passed: 0 };
          if (i.status === 'completed') {
            categoryMap[type].total++;
            if (i.rating === 'pass') categoryMap[type].passed++;
          }
        });
        const complianceByCategory = Object.entries(categoryMap).map(([name, val]) => ({
          name,
          rate: val.total > 0 ? Math.round((val.passed / val.total) * 100) : 0,
          total: (user?.role === 'technician' ? relevantAssets : (assets || [])).filter((a: any) => a.type === name).length,
        }));

        // Upcoming inspections — scoped
        const profileMap: Record<string, string> = {};
        profiles?.forEach((p: any) => { profileMap[p.id] = p.full_name; });

        const upcoming = (inspections || [])
          .filter((i: any) => i.status === 'scheduled' || i.status === 'overdue')
          .sort((a: any, b: any) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
          .slice(0, 5)
          .map((i: any) => {
            const asset = relevantAssets.find((a: any) => a.id === i.asset_id) || (assets || []).find((a: any) => a.id === i.asset_id);
            return {
              id: i.id,
              asset: asset?.name || 'Unknown',
              location: asset?.location || 'Unknown',
              type: i.inspection_type,
              date: i.scheduled_date,
              assignee: profileMap[i.inspector_id] || 'Unassigned',
              priority: i.status === 'overdue' ? 'high' : new Date(i.scheduled_date) <= new Date(Date.now() + 3 * 86400000) ? 'high' : new Date(i.scheduled_date) <= new Date(Date.now() + 7 * 86400000) ? 'medium' : 'low',
            };
          });

        // Recent activity — scoped to this tech's inspections
        const recent = (inspections || [])
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 8)
          .map((i: any) => {
            const asset = relevantAssets.find((a: any) => a.id === i.asset_id) || (assets || []).find((a: any) => a.id === i.asset_id);
            const inspectorName = profileMap[i.inspector_id] || 'Someone';
            const action = i.status === 'completed' ? 'completed inspection' : i.status === 'overdue' ? 'flagged overdue inspection' : 'scheduled inspection';
            const type = i.status === 'completed' ? 'inspection' : i.status === 'overdue' ? 'issue' : 'schedule';
            const timeAgo = getTimeAgo(new Date(i.created_at));
            return { id: i.id, user: inspectorName, action, target: asset?.name || 'Unknown', time: timeAgo, type };
          });

        // Priority assets — scoped to assets assigned to this tech
        const priority = (user?.role === 'technician' ? relevantAssets : (assets || []))
          .filter((a: any) => a.next_due && new Date(a.next_due) <= new Date(Date.now() + 14 * 86400000))
          .sort((a: any, b: any) => new Date(a.next_due).getTime() - new Date(b.next_due).getTime())
          .slice(0, 4)
          .map((a: any) => {
            const isOverdue = new Date(a.next_due) < now;
            const daysOverdue = isOverdue ? Math.floor((now.getTime() - new Date(a.next_due).getTime()) / 86400000) : 0;
            return {
              id: a.id,
              name: a.name,
              type: a.type,
              location: a.location,
              status: isOverdue ? 'Overdue' : daysOverdue === 0 ? 'Due Soon' : 'Upcoming',
              daysOverdue,
            };
          });

        // My Inspections — scoped to this tech
        const myInspections = (inspections || [])
          .filter((i: any) => i.inspector_id === user?.id)
          .sort((a: any, b: any) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())
          .slice(0, 8)
          .map((i: any) => {
            const asset = relevantAssets.find((a: any) => a.id === i.asset_id) || (assets || []).find((a: any) => a.id === i.asset_id);
            return {
              id: i.id,
              asset: asset?.name || 'Unknown Asset',
              location: asset?.location || 'Unknown',
              type: i.inspection_type,
              scheduledDate: i.scheduled_date,
              completedDate: i.completed_date,
              status: i.status,
              rating: i.rating,
              findings: i.findings,
            };
          });

        // Needs Scheduling — assets with approaching next_due but no active inspection
        // Only show for admin and manager roles
        const activeInspectionAssetIds = new Set(
          (inspections || [])
            .filter((i: any) => i.status === 'scheduled' || i.status === 'in_progress')
            .map((i: any) => i.asset_id)
        );

        const nowDate = new Date();
        const thirtyDaysFromNow = new Date(nowDate.getTime() + 30 * 86400000);

        const customerMap: Record<string, string> = {};
        try {
          const { data: allCustomers } = await supabase.from('customers').select('id, name');
          (allCustomers || []).forEach((c: any) => { customerMap[c.id] = c.name; });
        } catch { /* no-op */ }

        const needsSchedulingData = (assets || [])
          .filter((a: any) => {
            if (!a.next_due) return false;
            if (activeInspectionAssetIds.has(a.id)) return false;
            const dueDate = new Date(a.next_due);
            return dueDate <= thirtyDaysFromNow;
          })
          .sort((a: any, b: any) => new Date(a.next_due).getTime() - new Date(b.next_due).getTime())
          .map((a: any) => {
            const dueDate = new Date(a.next_due);
            const daysDiff = Math.ceil((dueDate.getTime() - nowDate.getTime()) / 86400000);
            return {
              assetId: a.id,
              assetName: a.name,
              assetType: a.type,
              location: a.location,
              customerId: a.customer_id,
              customerName: customerMap[a.customer_id] || 'Unknown',
              nextDue: a.next_due,
              daysUntilDue: daysDiff,
            };
          });

        setData({
          totalAssets,
          activeAssets,
          inspectionsThisMonth: monthInspections.length,
          inspectionsCompleted: completedThisMonth,
          inspectionsOverdue: overdue,
          complianceRate,
          monthlyInspections: monthlyData,
          complianceByCategory,
          upcomingInspections: upcoming,
          recentActivity: recent,
          priorityAssets: priority,
          myInspections,
          needsScheduling: needsSchedulingData,
          loading: false,
        });
      } catch {
        const { dashboardStats, monthlyInspections, complianceByCategory, upcomingInspections, recentActivity, priorityAssets } = await import('@/mocks/dashboard');

        let filteredUpcoming = upcomingInspections;
        let filteredMyInspections: any[] = [];
        let filteredRecent = recentActivity;
        let filteredStats = { ...dashboardStats };

        if (user?.role === 'technician') {
          filteredUpcoming = upcomingInspections.filter((i: any) => i.assignee === user?.fullName);
          filteredRecent = recentActivity.filter((a: any) => a.user === user?.fullName);
          filteredStats = {
            ...dashboardStats,
            totalAssets: filteredUpcoming.length,
            activeAssets: filteredUpcoming.length,
            inspectionsThisMonth: filteredUpcoming.length,
            inspectionsCompleted: 0,
            inspectionsOverdue: 0,
            complianceRate: 0,
          };
        }

        filteredMyInspections = filteredUpcoming.map((i: any) => ({
          id: i.id, asset: i.asset, location: i.location, type: i.type,
          scheduledDate: i.date, completedDate: null, status: 'scheduled', rating: null, findings: '',
        }));

        setData({
          ...filteredStats,
          activeAssets: filteredStats.activeAssets,
          monthlyInspections,
          complianceByCategory: user?.role === 'technician' ? [] : complianceByCategory,
          upcomingInspections: filteredUpcoming,
          recentActivity: filteredRecent,
          priorityAssets: filteredUpcoming.slice(0, 4).map((i: any) => ({
            id: i.id, name: i.asset, type: 'N/A', location: i.location,
            status: i.priority === 'high' ? 'Overdue' : 'Upcoming', daysOverdue: 0,
          })),
          myInspections: filteredMyInspections,
          needsScheduling: user?.role === 'technician' ? [] : (await import('@/mocks/dashboard')).needsScheduling,
          loading: false,
        });
      }
    }

    fetchAll();
  }, [user]);

  return data;
}

function getTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}
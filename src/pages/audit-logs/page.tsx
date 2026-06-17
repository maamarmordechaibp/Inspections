import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/feature/DashboardLayout';
import { supabase } from '@/lib/supabase';

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: any;
  new_data: any;
  changed_by_email: string;
  changed_at: string;
}

const actionStyles: Record<string, string> = {
  INSERT: 'bg-emerald-50 text-emerald-600',
  UPDATE: 'bg-amber-50 text-amber-600',
  DELETE: 'bg-red-50 text-red-500',
};

const tableLabels: Record<string, string> = {
  assets: 'Asset',
  inspections: 'Inspection',
  customers: 'Customer',
  invoices: 'Invoice',
  work_orders: 'Work Order',
  proposals: 'Proposal',
  recurring_schedules: 'Recurring Schedule',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error: err } = await supabase
          .from('audit_logs')
          .select('*')
          .order('changed_at', { ascending: false })
          .limit(200);

        if (err) throw err;
        setLogs((data || []) as AuditLog[]);
      } catch (err: any) {
        setError(err?.message || 'Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filtered = logs.filter((l) => {
    if (filter === 'all') return true;
    return l.action === filter;
  });

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track who changed what, when, and what the values were before and after.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
            <i className="ri-error-warning-line"></i>
            {error}
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700 cursor-pointer">Dismiss</button>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {[
            { key: 'all', label: 'All' },
            { key: 'INSERT', label: 'Created' },
            { key: 'UPDATE', label: 'Updated' },
            { key: 'DELETE', label: 'Deleted' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                filter === f.key
                  ? 'bg-brand-navy text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="text-sm text-gray-400 ml-2">{filtered.length} logs</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <i className="ri-loader-4-line animate-spin text-3xl text-brand-gold"></i>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <i className="ri-shield-check-line text-4xl text-gray-300 mb-4 block"></i>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No audit logs yet</h3>
            <p className="text-sm text-gray-500">
              Changes made to records will appear here once the audit logging is active.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Table</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Record</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {new Date(log.changed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.changed_by_email || 'System'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${actionStyles[log.action] || 'bg-gray-50 text-gray-500'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {tableLabels[log.table_name] || log.table_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-gray-500">{log.record_id.slice(0, 8)}...</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-sm text-brand-navy hover:text-brand-gold transition-colors cursor-pointer whitespace-nowrap"
                        >
                          View Changes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedLog(null)}></div>
            <div className="relative bg-white rounded-xl border border-gray-100 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-900">Change Details</h3>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    <span className="w-6 h-6 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-gray-50">
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Table</p>
                      <p className="font-medium text-gray-900 mt-1">{tableLabels[selectedLog.table_name] || selectedLog.table_name}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50">
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Action</p>
                      <p className="font-medium text-gray-900 mt-1">{selectedLog.action}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50">
                      <p className="text-xs text-gray-400 uppercase tracking-wider">User</p>
                      <p className="font-medium text-gray-900 mt-1">{selectedLog.changed_by_email || 'System'}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50">
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Time</p>
                      <p className="font-medium text-gray-900 mt-1">{new Date(selectedLog.changed_at).toLocaleString()}</p>
                    </div>
                  </div>

                  {selectedLog.old_data && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Before</p>
                      <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm font-mono overflow-x-auto">
                        {Object.entries(selectedLog.old_data).map(([key, val]) => (
                          <div key={key} className="flex items-start gap-2 py-0.5">
                            <span className="text-red-400 font-medium">{key}:</span>
                            <span className="text-gray-700">{formatValue(val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedLog.new_data && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">After</p>
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-sm font-mono overflow-x-auto">
                        {Object.entries(selectedLog.new_data).map(([key, val]) => (
                          <div key={key} className="flex items-start gap-2 py-0.5">
                            <span className="text-emerald-600 font-medium">{key}:</span>
                            <span className="text-gray-700">{formatValue(val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
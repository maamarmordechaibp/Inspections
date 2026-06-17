import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/feature/DashboardLayout';
import { supabase } from '@/lib/supabase';
import GenerateReportModal from './components/GenerateReportModal';
import { downloadReport } from './utils/downloadReport';

const reportTemplates = [
  {
    id: 'monthly-summary',
    name: 'Monthly Inspection Summary',
    description: 'Overview of all inspections completed this month with pass/fail rates.',
    icon: 'ri-bar-chart-grouped-fill',
    iconBg: 'bg-brand-navy/8',
    iconColor: 'text-brand-navy',
  },
  {
    id: 'compliance-audit',
    name: 'Compliance Audit Report',
    description: 'Full compliance status across all asset categories and standards.',
    icon: 'ri-shield-check-line',
    iconBg: 'bg-brand-gold/15',
    iconColor: 'text-brand-gold',
  },
  {
    id: 'asset-condition',
    name: 'Asset Condition Report',
    description: 'Detailed condition assessment for all active and maintenance assets.',
    icon: 'ri-tools-line',
    iconBg: 'bg-brand-cyan/15',
    iconColor: 'text-brand-cyan',
  },
  {
    id: 'overdue-actions',
    name: 'Overdue Actions Report',
    description: 'List of all overdue inspections and maintenance actions required.',
    icon: 'ri-alarm-warning-line',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
  },
];

interface ReportRecord {
  id: string;
  name: string;
  generated: string;
  generatedBy: string;
  format: string;
  size: string;
  reportType: string;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'templates' | 'history'>('templates');
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalTemplate, setModalTemplate] = useState<(typeof reportTemplates)[0] | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data: reportsData, error: reportsErr } = await supabase
        .from('reports')
        .select('id, name, format, size, created_at, generated_by, report_type')
        .order('created_at', { ascending: false });

      if (reportsErr) throw reportsErr;

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name');

      const profileMap: Record<string, string> = {};
      profilesData?.forEach((p: any) => {
        profileMap[p.id] = p.full_name;
      });

      if (reportsData && reportsData.length > 0) {
        setReports(reportsData.map((r: any) => ({
          id: r.id,
          name: r.name,
          generated: r.created_at,
          generatedBy: profileMap[r.generated_by] || 'Unknown',
          format: r.format || 'PDF',
          size: r.size || '—',
          reportType: r.report_type || 'summary',
        })));
      } else {
        setReports([
          { id: 'rpt-1', name: 'Monthly Inspection Summary', generated: '2026-05-15', generatedBy: 'Sarah Chen', format: 'PDF', size: '1.2 MB', reportType: 'inspection' },
          { id: 'rpt-2', name: 'Compliance Audit Report', generated: '2026-04-28', generatedBy: 'James Mitchell', format: 'PDF', size: '2.4 MB', reportType: 'compliance' },
          { id: 'rpt-3', name: 'Asset Condition Report', generated: '2026-03-10', generatedBy: 'David Park', format: 'PDF', size: '3.1 MB', reportType: 'summary' },
          { id: 'rpt-4', name: 'Q1 Safety Audit', generated: '2026-03-31', generatedBy: 'Sarah Chen', format: 'PDF', size: '4.5 MB', reportType: 'compliance' },
        ]);
      }
    } catch {
      setReports([
        { id: 'rpt-1', name: 'Monthly Inspection Summary', generated: '2026-05-15', generatedBy: 'Sarah Chen', format: 'PDF', size: '1.2 MB', reportType: 'inspection' },
        { id: 'rpt-2', name: 'Compliance Audit Report', generated: '2026-04-28', generatedBy: 'James Mitchell', format: 'PDF', size: '2.4 MB', reportType: 'compliance' },
        { id: 'rpt-3', name: 'Asset Condition Report', generated: '2026-03-10', generatedBy: 'David Park', format: 'PDF', size: '3.1 MB', reportType: 'summary' },
        { id: 'rpt-4', name: 'Q1 Safety Audit', generated: '2026-03-31', generatedBy: 'Sarah Chen', format: 'PDF', size: '4.5 MB', reportType: 'compliance' },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleOpenModal = (tpl: typeof reportTemplates[0]) => {
    setModalTemplate(tpl);
  };

  const handleCloseModal = () => {
    setModalTemplate(null);
  };

  const handleReportGenerated = () => {
    loadReports();
    setActiveTab('history');
  };

  const handleDownload = async (rpt: ReportRecord) => {
    if (downloadingId) return;
    setDownloadingId(rpt.id);
    try {
      await downloadReport({
        id: rpt.id,
        name: rpt.name,
        reportType: rpt.reportType,
        format: rpt.format,
        generatedBy: rpt.generatedBy,
        generatedAt: rpt.generated,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <DashboardLayout allowedRoles={['admin', 'manager']}>
      <div className="max-w-[1400px] mx-auto">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Reports</h2>

        <div className="flex gap-1 mb-4 md:mb-6">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'templates'
                ? 'bg-brand-navy text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-brand-navy text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            History
          </button>
        </div>

        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
            {reportTemplates.map((tpl) => (
              <div key={tpl.id} className="bg-white rounded-xl border border-gray-100 p-4 md:p-5 hover:border-gray-200 transition-all">
                <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg ${tpl.iconBg} flex items-center justify-center mb-3 md:mb-4`}>
                  <i className={`${tpl.icon} ${tpl.iconColor} text-base md:text-lg w-4 md:w-5 h-4 md:h-5 flex items-center justify-center`}></i>
                </div>
                <h3 className="text-xs md:text-sm font-semibold text-gray-900 mb-1">{tpl.name}</h3>
                <p className="text-[11px] md:text-xs text-gray-500 leading-relaxed mb-3 md:mb-4">{tpl.description}</p>
                <button
                  onClick={() => handleOpenModal(tpl)}
                  className="w-full py-2 md:py-2.5 bg-brand-gold hover:bg-brand-gold/90 text-white text-xs md:text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  Generate Report
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-xl border border-gray-100">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <i className="ri-loader-4-line animate-spin text-3xl text-brand-gold"></i>
              </div>
            ) : (
              <div className="table-scroll overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Report ID</th>
                      <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Generated</th>
                      <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">By</th>
                      <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Format</th>
                      <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Size</th>
                      <th className="px-3 md:px-4 py-3 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((rpt) => (
                      <tr key={rpt.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium text-brand-navy">{rpt.id.slice(0, 8)}...</td>
                        <td className="px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-gray-900">{rpt.name}</td>
                        <td className="px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-gray-600">
                          {new Date(rpt.generated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-gray-600">{rpt.generatedBy}</td>
                        <td className="px-3 md:px-4 py-2.5 md:py-3">
                          <span className={`inline-flex items-center px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-medium ${
                            rpt.format === 'CSV' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                          }`}>
                            {rpt.format}
                          </span>
                        </td>
                        <td className="px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-gray-600">{rpt.size}</td>
                        <td className="px-3 md:px-4 py-2.5 md:py-3">
                          <button
                            onClick={() => handleDownload(rpt)}
                            disabled={downloadingId === rpt.id}
                            className={`text-gray-400 hover:text-brand-navy transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${downloadingId === rpt.id ? 'animate-pulse' : ''}`}
                            title={rpt.format === 'CSV' ? 'Download CSV' : 'Download Report (HTML)'}
                          >
                            {downloadingId === rpt.id ? (
                              <i className="ri-loader-4-line animate-spin text-base md:text-lg"></i>
                            ) : (
                              <i className="ri-download-line text-base md:text-lg"></i>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reports.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <i className="ri-file-list-3-line text-3xl mb-2"></i>
                    <p className="text-sm">No reports generated yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Generate Report Modal */}
        <GenerateReportModal
          isOpen={modalTemplate !== null}
          onClose={handleCloseModal}
          template={modalTemplate}
          onGenerated={handleReportGenerated}
        />
      </div>
    </DashboardLayout>
  );
}
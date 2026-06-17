import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Document {
  id: string;
  customer_id: string;
  asset_id: string | null;
  inspection_id: string | null;
  file_name: string;
  file_url: string;
  file_type: string;
  document_type: string;
  file_size: number | null;
  uploaded_by_email: string | null;
  created_at: string;
}

const DOC_TYPES = [
  { value: 'inspection_report', label: 'Inspection Report' },
  { value: 'permit', label: 'Fire Permit' },
  { value: 'building_plan', label: 'Building Plan' },
  { value: 'service_contract', label: 'Service Contract' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'other', label: 'Other' },
];

const typeStyles: Record<string, string> = {
  inspection_report: 'bg-brand-navy/10 text-brand-navy',
  permit: 'bg-emerald-50 text-emerald-700',
  building_plan: 'bg-amber-50 text-amber-700',
  service_contract: 'bg-brand-cyan/10 text-brand-cyan',
  warranty: 'bg-purple-50 text-purple-600',
  other: 'bg-gray-100 text-gray-600',
};

const typeIcons: Record<string, string> = {
  inspection_report: 'ri-clipboard-line',
  permit: 'ri-government-line',
  building_plan: 'ri-building-line',
  service_contract: 'ri-file-text-line',
  warranty: 'ri-shield-check-line',
  other: 'ri-file-line',
};

function formatSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface CustomerDocumentsProps {
  customerId: string;
}

export default function CustomerDocuments({ customerId }: CustomerDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState('all');

  // Add form state
  const [addUrl, setAddUrl] = useState('');
  const [addName, setAddName] = useState('');
  const [addType, setAddType] = useState('inspection_report');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState('');

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocs() {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          setDocuments(data as Document[]);
        }
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    }
    fetchDocs();
  }, [customerId]);

  const filtered = filterType === 'all'
    ? documents
    : documents.filter((d) => d.document_type === filterType);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!addUrl.trim() || !addName.trim()) {
      setAddError('File URL and name are required.');
      return;
    }
    setAddSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user?.email || null;
      const { data, error } = await supabase
        .from('documents')
        .insert({
          customer_id: customerId,
          file_name: addName.trim(),
          file_url: addUrl.trim(),
          file_type: 'pdf',
          document_type: addType,
          uploaded_by_email: email,
        })
        .select()
        .single();
      if (error) throw error;
      setDocuments((prev) => [data as Document, ...prev]);
      setShowAddModal(false);
      setAddUrl('');
      setAddName('');
      setAddType('inspection_report');
    } catch (err: any) {
      setAddError(err.message || 'Failed to add document.');
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (!error) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      }
    } catch { /* silent */ } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Documents</h3>
          <span className="text-xs text-gray-400">({documents.length})</span>
        </div>
        <button
          onClick={() => { setAddError(''); setShowAddModal(true); }}
          className="px-3 py-1.5 bg-brand-navy text-white text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap hover:bg-brand-navy/90 transition-colors"
        >
          <i className="ri-add-line mr-1"></i> Add Document
        </button>
      </div>

      {documents.length > 1 && (
        <div className="px-4 py-2 border-b border-gray-50 flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${filterType === 'all' ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          {DOC_TYPES.filter((t) => documents.some((d) => d.document_type === t.value)).map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${filterType === t.value ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <i className="ri-loader-4-line animate-spin text-2xl text-brand-gold"></i>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
          <span className="w-10 h-10 flex items-center justify-center mb-2">
            <i className="ri-folder-open-line text-3xl"></i>
          </span>
          <p className="text-sm">{filterType === 'all' ? 'No documents uploaded yet.' : `No ${DOC_TYPES.find(t => t.value === filterType)?.label?.toLowerCase()} documents.`}</p>
          <button
            onClick={() => { setAddError(''); setShowAddModal(true); }}
            className="mt-3 text-sm text-brand-gold hover:text-brand-navy font-medium transition-colors cursor-pointer"
          >
            Upload first document
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {filtered.map((doc) => (
            <div key={doc.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50/50 transition-colors group">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100">
                <i className={`${typeIcons[doc.document_type] || 'ri-file-line'} text-gray-500`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${typeStyles[doc.document_type] || 'bg-gray-100 text-gray-600'}`}>
                    {DOC_TYPES.find((t) => t.value === doc.document_type)?.label || doc.document_type}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {doc.uploaded_by_email && (
                    <span className="text-[11px] text-gray-400 hidden sm:inline truncate max-w-[120px]">by {doc.uploaded_by_email}</span>
                  )}
                  {doc.file_size && <span className="text-[11px] text-gray-400">{formatSize(doc.file_size)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-brand-navy hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Open document"
                >
                  <i className="ri-external-link-line text-sm"></i>
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                  title="Delete document"
                >
                  {deletingId === doc.id ? (
                    <span className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <i className="ri-delete-bin-6-line text-sm"></i>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddModal(false)}></div>
          <div className="relative bg-white rounded-xl border border-gray-100 w-full max-w-md mx-4">
            <form onSubmit={handleAdd} className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900">Add Document</h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <span className="w-6 h-6 flex items-center justify-center"><i className="ri-close-line text-lg"></i></span>
                </button>
              </div>

              {addError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
                  <i className="ri-error-warning-line flex-shrink-0"></i>
                  {addError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Document Type</label>
                  <select
                    value={addType}
                    onChange={(e) => setAddType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-navy/30 focus:ring-2 focus:ring-brand-navy/10 cursor-pointer"
                  >
                    {DOC_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">File Name</label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. NFPA 72 Inspection Report Jan 2026"
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-navy/30 focus:ring-2 focus:ring-brand-navy/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">File URL</label>
                  <input
                    type="url"
                    value={addUrl}
                    onChange={(e) => setAddUrl(e.target.value)}
                    placeholder="https://..."
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-navy/30 focus:ring-2 focus:ring-brand-navy/10 transition-all"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Paste the URL to your document (Google Drive, Dropbox, S3, etc.)</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-brand-navy hover:bg-brand-navy/90 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                >
                  {addSubmitting ? (
                    <span className="flex items-center gap-2 justify-center">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Adding...
                    </span>
                  ) : (
                    'Add Document'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
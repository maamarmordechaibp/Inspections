import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getAuthRedirectUrl } from '@/lib/authUrls';
import { useAuth } from '@/context';
import DashboardLayout from '@/components/feature/DashboardLayout';

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'technician';
  phone: string | null;
  sip_uri: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

interface CallLogEntry {
  id: string;
  inspector_id: string | null;
  inspector_name: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  call_sid: string | null;
  action: 'call' | 'bridge';
  status: string;
  using_sip: boolean;
  created_at: string;
}

type Tab = 'users' | 'calls';

const roleColors: Record<string, string> = {
  admin: 'bg-amber-100 text-amber-800',
  manager: 'bg-emerald-100 text-emerald-800',
  technician: 'bg-slate-100 text-slate-700',
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('users');

  // ─── Users state ───
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [pwdChanging, setPwdChanging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Create form state
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<'technician' | 'manager' | 'admin'>('technician');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newSipUri, setNewSipUri] = useState('');

  // Edit form state
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<'technician' | 'manager' | 'admin'>('technician');
  const [editPassword, setEditPassword] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSipUri, setEditSipUri] = useState('');

  // ─── Call log state ───
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [callSearch, setCallSearch] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'list' },
      });

      if (error) throw new Error(error.message || 'Edge function failed');
      if (data?.success && data.users) {
        setUsers(data.users);
        setLoading(false);
        return;
      }
      throw new Error(data?.error || 'No users returned');
    } catch (err: any) {
      try {
        const { data: profiles, error: profileErr } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, phone, sip_uri, created_at')
          .order('created_at', { ascending: false });

        if (profileErr) throw profileErr;

        const fallbackUsers = (profiles || []).map((p: any) => ({
          id: p.id,
          email: p.email || '',
          full_name: p.full_name || '',
          role: p.role || 'technician',
          phone: p.phone || null,
          sip_uri: p.sip_uri || null,
          created_at: p.created_at,
          last_sign_in_at: null,
        }));

        setUsers(fallbackUsers);
        setErrorMsg('');
      } catch (fallbackErr: any) {
        setErrorMsg(fallbackErr.message || 'Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const fetchCallLogs = useCallback(async () => {
    setCallsLoading(true);
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setCallLogs((data || []) as CallLogEntry[]);
    } catch {
      // Non-critical — just show empty
      setCallLogs([]);
    } finally {
      setCallsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'calls') {
      fetchCallLogs();
    }
  }, [activeTab, fetchCallLogs]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setActionLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create',
          email: newEmail.trim(),
          password: newPassword,
          full_name: newFullName.trim(),
          role: newRole,
          phone: newPhone.trim() || undefined,
          sip_uri: newSipUri.trim() || undefined,
        },
      });

      if (!error && data?.success) {
        setSuccessMsg(`User ${data.user.email} created successfully!`);
        setShowCreateModal(false);
        setNewEmail('');
        setNewFullName('');
        setNewRole('technician');
        setNewPassword('');
        setNewPhone('');
        setNewSipUri('');
        fetchUsers();
        setActionLoading(false);
        return;
      }

      if (data?.error) throw new Error(data.error);
      if (error) throw new Error(error.message);
    } catch (err: any) {
      try {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: newEmail.trim(),
          password: newPassword,
          options: {
            data: { full_name: newFullName.trim() },
            emailRedirectTo: getAuthRedirectUrl('/login'),
          },
        });

        if (signUpErr) {
          if (signUpErr.message?.includes('already registered') || signUpErr.message?.includes('already exists')) {
            setErrorMsg('A user with this email already exists.');
          } else {
            setErrorMsg(`Create failed: ${signUpErr.message}`);
          }
          setActionLoading(false);
          return;
        }

        if (signUpData.user) {
          const updateData: any = { role: newRole, email: newEmail.trim(), full_name: newFullName.trim() };
          if (newPhone.trim()) updateData.phone = newPhone.trim();
          if (newSipUri.trim()) updateData.sip_uri = newSipUri.trim();
          await supabase.from('profiles').update(updateData).eq('id', signUpData.user.id);

          setSuccessMsg('User created successfully! They will need to confirm their email.');
          setShowCreateModal(false);
          setNewEmail('');
          setNewFullName('');
          setNewRole('technician');
          setNewPassword('');
          setNewPhone('');
          setNewSipUri('');
          fetchUsers();
        }
      } catch (fallbackErr: any) {
        setErrorMsg(err.message || fallbackErr.message || 'Failed to create user');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    setErrorMsg('');
    setActionLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'delete', user_id: userId },
      });

      if (!error && data?.success) {
        setSuccessMsg('User deleted successfully.');
        setDeleteConfirm(null);
        fetchUsers();
        setActionLoading(false);
        return;
      }

      if (data?.error) throw new Error(data.error);
      if (error) throw new Error(error.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (u: UserRecord) => {
    setEditingUser(u);
    setEditFullName(u.full_name);
    setEditRole(u.role);
    setEditPassword('');
    setEditPhone(u.phone || '');
    setEditSipUri(u.sip_uri || '');
    setErrorMsg('');
    setPwdChanging(false);
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setActionLoading(true);

    if (!editingUser) return;

    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'edit',
          user_id: editingUser.id,
          full_name: editFullName.trim(),
          role: editRole,
          phone: editPhone.trim(),
          sip_uri: editSipUri.trim(),
        },
      });

      if (!error && data?.success) {
        setSuccessMsg('User updated successfully!');
        setShowEditModal(false);
        setEditingUser(null);
        fetchUsers();
        setActionLoading(false);
        return;
      }

      if (data?.error) throw new Error(data.error);
      if (error) throw new Error(error.message);
    } catch (err: any) {
      // Fallback: update profiles directly
      try {
        const profileUpdate: any = { full_name: editFullName.trim(), role: editRole };
        profileUpdate.phone = editPhone.trim();
        profileUpdate.sip_uri = editSipUri.trim();
        await supabase.from('profiles').update(profileUpdate).eq('id', editingUser.id);

        setSuccessMsg('User profile updated successfully!');
        setShowEditModal(false);
        setEditingUser(null);
        fetchUsers();
      } catch (fallbackErr: any) {
        setErrorMsg(err.message || fallbackErr.message || 'Failed to update user');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!editingUser || !editPassword) return;
    if (editPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    setErrorMsg('');
    setPwdChanging(true);

    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'change_password',
          user_id: editingUser.id,
          password: editPassword,
        },
      });

      if (!error && data?.success) {
        setSuccessMsg('Password changed successfully!');
        setEditPassword('');
        setPwdChanging(false);
        return;
      }

      if (data?.error) throw new Error(data.error);
      if (error) throw new Error(error.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to change password');
    } finally {
      setPwdChanging(false);
    }
  };

  const filteredUsers = users
    .filter((u) => (roleFilter === 'all' ? true : u.role === roleFilter))
    .filter((u) => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return u.email.toLowerCase().includes(s) || u.full_name.toLowerCase().includes(s);
    });

  const filteredCallLogs = callLogs.filter((log) => {
    if (!callSearch) return true;
    const s = callSearch.toLowerCase();
    return (
      log.inspector_name.toLowerCase().includes(s) ||
      log.customer_name.toLowerCase().includes(s) ||
      (log.customer_phone && log.customer_phone.includes(s))
    );
  });

  const formatTimeAgo = (dateStr: string) => {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500 mt-1">Create, manage, and remove team accounts</p>
          </div>
          {activeTab === 'users' && (
            <button
              onClick={() => {
                setErrorMsg('');
                setSuccessMsg('');
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-navy text-white rounded-lg text-sm font-medium hover:bg-brand-navy/90 transition-colors whitespace-nowrap cursor-pointer"
            >
              <span className="w-5 h-5 flex items-center justify-center">
                <i className="ri-user-add-line"></i>
              </span>
              Create User
            </button>
          )}
        </div>

        {/* Messages */}
        {errorMsg && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <i className="ri-error-warning-line"></i>
            </span>
            {errorMsg}
            <button onClick={() => setErrorMsg('')} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer">
              <span className="w-5 h-5 flex items-center justify-center">
                <i className="ri-close-line"></i>
              </span>
            </button>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
            <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <i className="ri-check-line"></i>
            </span>
            {successMsg}
            <button onClick={() => setSuccessMsg('')} className="ml-auto text-emerald-400 hover:text-emerald-600 cursor-pointer">
              <span className="w-5 h-5 flex items-center justify-center">
                <i className="ri-close-line"></i>
              </span>
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-gray-100 rounded-full p-1 w-fit">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="w-4 h-4 inline-flex items-center justify-center mr-1.5">
              <i className="ri-team-line"></i>
            </span>
            Users
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'calls'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="w-4 h-4 inline-flex items-center justify-center mr-1.5">
              <i className="ri-phone-line"></i>
            </span>
            Recent Calls
          </button>
        </div>

        {/* ─────── USERS TAB ─────── */}
        {activeTab === 'users' && (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{users.length}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Admins</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{users.filter((u) => u.role === 'admin').length}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Technicians</p>
                <p className="text-2xl font-bold text-slate-600 mt-1">{users.filter((u) => u.role === 'technician').length}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400">
                  <i className="ri-search-line text-sm"></i>
                </span>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
                />
              </div>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {['all', 'admin', 'manager', 'technician'].map((role) => (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                      roleFilter === role
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-brand-navy rounded-full animate-spin"></div>
                    <span className="text-sm">Loading users...</span>
                  </div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <span className="w-12 h-12 flex items-center justify-center mb-3">
                    <i className="ri-user-search-line text-3xl"></i>
                  </span>
                  <p className="text-sm">No users found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Phone / SIP</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Created</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Last Sign In</th>
                        <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 flex-shrink-0">
                                {u.full_name ? u.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : u.email[0].toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{u.full_name || '—'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-gray-600">{u.email}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[u.role] || 'bg-gray-100 text-gray-600'}`}>
                              {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              {u.phone ? (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                                  <span className="w-4 h-4 flex items-center justify-center text-emerald-500">
                                    <i className="ri-phone-line text-xs"></i>
                                  </span>
                                  {u.phone}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-300">No phone</span>
                              )}
                              {u.sip_uri && (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                                  <span className="w-3.5 h-3.5 flex items-center justify-center text-brand-navy">
                                    <i className="ri-wifi-line text-[10px]"></i>
                                  </span>
                                  SIP
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            <span className="text-sm text-gray-500 whitespace-nowrap">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 hidden lg:table-cell">
                            <span className="text-sm text-gray-500 whitespace-nowrap">
                              {u.last_sign_in_at
                                ? new Date(u.last_sign_in_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : 'Never'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(u)}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:text-brand-navy hover:bg-gray-100 transition-colors whitespace-nowrap cursor-pointer"
                                title="Edit user"
                              >
                                <span className="w-4 h-4 flex items-center justify-center">
                                  <i className="ri-edit-line"></i>
                                </span>
                                <span className="hidden sm:inline">Edit</span>
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(u.id)}
                                disabled={u.id === currentUser?.id || actionLoading}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                                  u.id === currentUser?.id
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-red-500 hover:bg-red-50'
                                }`}
                                title={u.id === currentUser?.id ? 'Cannot delete yourself' : 'Delete user'}
                              >
                                <span className="w-4 h-4 flex items-center justify-center">
                                  <i className="ri-delete-bin-line"></i>
                                </span>
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ─────── RECENT CALLS TAB ─────── */}
        {activeTab === 'calls' && (
          <>
            {/* Call Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Total Calls</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{callLogs.length}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Bridge Calls</p>
                <p className="text-2xl font-bold text-brand-navy mt-1">{callLogs.filter((c) => c.action === 'bridge').length}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wider">SIP Calls</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{callLogs.filter((c) => c.using_sip).length}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Today</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {callLogs.filter((c) => {
                    const d = new Date(c.created_at);
                    const today = new Date();
                    return d.toDateString() === today.toDateString();
                  }).length}
                </p>
              </div>
            </div>

            {/* Call Search */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400">
                <i className="ri-search-line text-sm"></i>
              </span>
              <input
                type="text"
                placeholder="Search by inspector or customer name..."
                value={callSearch}
                onChange={(e) => setCallSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
              />
            </div>

            {/* Call Log Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {callsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-brand-navy rounded-full animate-spin"></div>
                    <span className="text-sm">Loading call logs...</span>
                  </div>
                </div>
              ) : filteredCallLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <span className="w-12 h-12 flex items-center justify-center mb-3">
                    <i className="ri-phone-line text-3xl"></i>
                  </span>
                  <p className="text-sm">No call records yet</p>
                  <p className="text-xs text-gray-300 mt-1">Calls made from inspections will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Inspector</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Type</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Method</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCallLogs.map((log) => (
                        <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900 whitespace-nowrap">{formatTimeAgo(log.created_at)}</p>
                              <p className="text-xs text-gray-400 whitespace-nowrap">
                                {new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-brand-navy/8 flex items-center justify-center text-xs font-semibold text-brand-navy flex-shrink-0">
                                {log.inspector_name ? log.inspector_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                              </div>
                              <span className="text-sm text-gray-900 whitespace-nowrap">{log.inspector_name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="min-w-0 max-w-[180px]">
                              <p className="text-sm text-gray-900 truncate">{log.customer_name}</p>
                              {log.customer_phone && (
                                <p className="text-xs text-gray-400 truncate">{log.customer_phone}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3 hidden sm:table-cell">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              log.action === 'bridge' ? 'bg-brand-cyan/10 text-brand-cyan' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {log.action === 'bridge' ? 'Bridge' : 'Direct'}
                            </span>
                          </td>
                          <td className="px-5 py-3 hidden md:table-cell">
                            <span className={`inline-flex items-center gap-1 text-xs ${log.using_sip ? 'text-emerald-600' : 'text-gray-500'}`}>
                              <span className="w-3.5 h-3.5 flex items-center justify-center">
                                <i className={log.using_sip ? 'ri-wifi-line' : 'ri-smartphone-line'}></i>
                              </span>
                              {log.using_sip ? 'SIP' : 'PSTN'}
                            </span>
                          </td>
                          <td className="px-5 py-3 hidden lg:table-cell">
                            <span className="text-sm text-gray-500 capitalize">{log.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ─── Create User Modal ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateModal(false)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Create New User</h2>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <i className="ri-close-line text-lg text-gray-400"></i>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  required
                  placeholder="John Doe"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  placeholder="user@dousefire.co"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                  {(['technician', 'manager', 'admin'] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setNewRole(role)}
                      className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                        newRole === role
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
                />
                <p className="text-xs text-gray-400 mt-1">Used for bridge calls — SignalWire will dial this number</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SIP URI</label>
                <input
                  type="text"
                  value={newSipUri}
                  onChange={(e) => setNewSipUri(e.target.value)}
                  placeholder="sip:inspector@dousefire.sip.us1.twilio.com"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
                />
                <p className="text-xs text-gray-400 mt-1">Office VoIP endpoint — takes priority over phone for calls</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
                />
              </div>

              {errorMsg && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{errorMsg}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-brand-navy text-white text-sm font-medium hover:bg-brand-navy/90 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  {actionLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-red-500"></i>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete User?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              This action cannot be undone. The user will lose all access immediately.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit User Modal ─── */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEditModal(false)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <i className="ri-close-line text-lg text-gray-400"></i>
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 text-gray-400"
                />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed. Create a new user instead.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                  {(['technician', 'manager', 'admin'] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setEditRole(role)}
                      className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                        editRole === role
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone & SIP Section */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Call Settings</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
                    />
                    <p className="text-xs text-gray-400 mt-1">Inspector's cell or desk phone for bridge calls</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SIP URI</label>
                    <input
                      type="text"
                      value={editSipUri}
                      onChange={(e) => setEditSipUri(e.target.value)}
                      placeholder="sip:inspector@dousefire.sip.us1.twilio.com"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
                    />
                    <p className="text-xs text-gray-400 mt-1">Office VoIP SIP endpoint — overrides phone when set</p>
                  </div>
                </div>
              </div>

              {/* Password Change Section */}
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Change Password</label>
                <p className="text-xs text-gray-400 mb-2">Leave blank to keep current password.</p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="New password (min. 6 chars)"
                    minLength={6}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={!editPassword || pwdChanging}
                    className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    {pwdChanging ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span>
                    ) : (
                      'Update'
                    )}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{errorMsg}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-brand-navy text-white text-sm font-medium hover:bg-brand-navy/90 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
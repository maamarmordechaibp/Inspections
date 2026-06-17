import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context';
import Logo from '@/components/base/Logo';

export default function LoginPage() {
  const { user, login, loading: authLoading, resendVerification } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);

  const getRedirectPath = (role: string): string => {
    switch (role) {
      case 'admin': return '/';
      case 'manager': return '/schedule';
      case 'technician': return '/inspections';
      default: return '/';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <i className="ri-loader-4-line animate-spin text-3xl text-brand-gold"></i>
      </div>
    );
  }

  if (user) {
    navigate(getRedirectPath(user.role), { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate(getRedirectPath(result.role || 'admin'), { replace: true });
    } else {
      if (result.needsVerification) {
        setNeedsVerification(true);
      }
      setError(result.error || 'Login failed');
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    setError('');
    const result = await resendVerification(email);
    setResending(false);

    if (result.success) {
      setError('');
    } else {
      setError(result.error || 'Failed to resend verification email.');
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-brand-navy relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10 text-center px-12">
          <Logo variant="full" light className="justify-center mb-8" />
          <p className="text-lg text-white/50 max-w-md leading-relaxed mt-6">
            Maintenance &amp; Inspection Management Platform. Track schedules, manage assets, and ensure fire safety compliance — all in one place.
          </p>
          <div className="flex items-center gap-3 justify-center mt-10">
            <div className="flex items-center gap-2 text-white/30 text-sm">
              <i className="ri-shield-check-line"></i>
              <span>NFPA Compliant</span>
            </div>
            <span className="text-white/20">·</span>
            <div className="flex items-center gap-2 text-white/30 text-sm">
              <i className="ri-timer-line"></i>
              <span>Real-time Tracking</span>
            </div>
            <span className="text-white/20">·</span>
            <div className="flex items-center gap-2 text-white/30 text-sm">
              <i className="ri-file-chart-line"></i>
              <span>Auto Reports</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-10">
            <Logo variant="full" className="justify-center" />
            <p className="text-sm text-gray-500 mt-3">Sign in to your account</p>
          </div>

          <div className="lg:hidden" />
          <h2 className="hidden lg:block text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="hidden lg:block text-sm text-gray-500 mb-8">Sign in to your DouseFire account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className={`flex flex-col gap-2 p-3 rounded-lg border text-sm ${
                needsVerification
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-red-50 border-red-100 text-red-700'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <i className={needsVerification ? 'ri-mail-check-line' : 'ri-error-warning-line'}></i>
                  </span>
                  <span>{error}</span>
                </div>
                {needsVerification && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resending}
                    className="ml-7 self-start inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {resending ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-amber-400 border-t-amber-700 rounded-full animate-spin"></span>
                        Resending...
                      </>
                    ) : (
                      <>
                        <span className="w-4 h-4 flex items-center justify-center">
                          <i className="ri-send-plane-line"></i>
                        </span>
                        Resend verification email
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <i className="ri-mail-line text-sm w-5 h-5 flex items-center justify-center"></i>
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <i className="ri-lock-line text-sm w-5 h-5 flex items-center justify-center"></i>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className={`text-sm w-5 h-5 flex items-center justify-center ${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'}`}></i>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-brand-gold focus:ring-brand-gold" />
                <span className="text-sm text-gray-500">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-brand-gold hover:text-brand-gold/80 font-medium">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-brand-gold hover:bg-brand-gold/90 text-white font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <i className="ri-loader-4-line animate-spin w-5 h-5 flex items-center justify-center"></i>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <i className="ri-arrow-right-line w-5 h-5 flex items-center justify-center"></i>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getAuthRedirectUrl } from '@/lib/authUrls';
import Logo from '@/components/base/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthRedirectUrl('/reset-password'),
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSubmitted(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
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
            Reset your password to get back to managing inspections and keeping properties safe.
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
            <p className="text-sm text-gray-500 mt-3">Reset your password</p>
          </div>

          <div className="mb-8">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
            >
              <i className="ri-arrow-left-line w-4 h-4 flex items-center justify-center"></i>
              Back to sign in
            </Link>
            <h2 className="hidden lg:block text-2xl font-bold text-gray-900 mb-1">Forgot password?</h2>
            <p className="hidden lg:block text-sm text-gray-500 mb-6">
              Enter your email and we will send you a reset link.
            </p>
          </div>

          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <i className="ri-mail-send-line text-2xl text-emerald-600 w-8 h-8 flex items-center justify-center"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h3>
              <p className="text-sm text-gray-500 mb-6">
                We sent a password reset link to <strong className="text-gray-700">{email}</strong>. Click the link to reset your password.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-brand-gold hover:bg-brand-gold/90 text-white font-semibold text-sm transition-all cursor-pointer whitespace-nowrap"
              >
                Return to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-red-50 border-red-100 text-sm text-red-700">
                  <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <i className="ri-error-warning-line"></i>
                  </span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-brand-gold hover:bg-brand-gold/90 text-white font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin w-5 h-5 flex items-center justify-center"></i>
                    Sending...
                  </>
                ) : (
                  <>
                    Send reset link
                    <i className="ri-arrow-right-line w-5 h-5 flex items-center justify-center"></i>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
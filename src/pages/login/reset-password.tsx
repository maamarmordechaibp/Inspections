import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/base/Logo';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Supabase returned an error in the URL hash (e.g. otp_expired)
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const errorCode = params.get('error_code');
      const errorDesc = params.get('error_description');
      if (errorCode) {
        const msg = errorDesc
          ? decodeURIComponent(errorDesc.replace(/\+/g, ' '))
          : 'This reset link is invalid or has expired.';
        setLinkError(msg);
        setCheckingSession(false);
        return;
      }
    }

    // Supabase automatically detects the access_token in the hash and sets up a session
    // We wait for the auth state to change or check for existing session
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setHasSession(true);
        setCheckingSession(false);
      } else if (event === 'SIGNED_IN' && session) {
        setHasSession(true);
        setCheckingSession(false);
      }
    });

    // Also check for existing session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
      }
      setCheckingSession(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      // Clear the session after password reset so user has to log in again
      await supabase.auth.signOut();
      localStorage.removeItem('dousefire_user');
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <i className="ri-loader-4-line animate-spin text-3xl text-brand-gold"></i>
      </div>
    );
  }

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
            Choose a strong new password to keep your account secure.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-10">
            <Logo variant="full" className="justify-center" />
            <p className="text-sm text-gray-500 mt-3">Set a new password</p>
          </div>

          <div className="mb-8">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
            >
              <i className="ri-arrow-left-line w-4 h-4 flex items-center justify-center"></i>
              Back to sign in
            </Link>
            <h2 className="hidden lg:block text-2xl font-bold text-gray-900 mb-1">Set new password</h2>
            <p className="hidden lg:block text-sm text-gray-500 mb-6">
              Enter a new password for your account.
            </p>
          </div>

          {!hasSession && !checkingSession ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <i className="ri-link-unlink-m text-2xl text-amber-600 w-8 h-8 flex items-center justify-center"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Invalid or expired link</h3>
              <p className="text-sm text-gray-500 mb-6">
                {linkError || 'This password reset link is invalid or has expired. Please request a new one.'}
              </p>
              <Link
                to="/forgot-password"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-brand-gold hover:bg-brand-gold/90 text-white font-semibold text-sm transition-all cursor-pointer whitespace-nowrap"
              >
                Request new reset link
              </Link>
            </div>
          ) : success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <i className="ri-shield-check-line text-2xl text-emerald-600 w-8 h-8 flex items-center justify-center"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Password has been reset!</h3>
              <p className="text-sm text-gray-500 mb-6">
                Your password has been successfully updated. You can now sign in with your new password.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-brand-gold hover:bg-brand-gold/90 text-white font-semibold text-sm transition-all cursor-pointer whitespace-nowrap"
              >
                Sign in with new password
              </button>
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
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  New Password
                </label>
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
                    minLength={6}
                    placeholder="Min. 6 characters"
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

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <i className="ri-lock-line text-sm w-5 h-5 flex items-center justify-center"></i>
                  </span>
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Re-enter password"
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
                    Updating password...
                  </>
                ) : (
                  <>
                    Reset Password
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
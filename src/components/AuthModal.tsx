import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, KeyRound, Mail, X } from 'lucide-react';
import { apiFetch, setInMemoryAuthToken } from '../utils/api.ts';
import type { AuthUser } from '../types/domain.ts';

interface AuthModalProps {
  open: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onAuthenticated: (user: AuthUser, isNewAccount: boolean) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  initialMode = 'login',
  onClose,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'verify' | 'reset'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState('');
  const [previewResetToken, setPreviewResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
      setInfo(null);
    }
  }, [open, initialMode]);

  if (!open) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ user: AuthUser; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setInMemoryAuthToken(res.token);
      onAuthenticated(res.user, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{
        user: AuthUser;
        token: string;
        previewVerificationCode?: string;
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, password }),
      });
      setInMemoryAuthToken(res.token);
      setPendingUser(res.user);
      setPreviewCode(res.previewVerificationCode ?? null);
      setMode('verify');
      setInfo('Account created. Verify your email code below or continue straight to onboarding.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ user: AuthUser }>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ code: verificationCode }),
      });
      onAuthenticated(res.user, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string; previewResetToken?: string | null }>(
        '/api/auth/request-password-reset',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        }
      );
      setInfo(res.message);
      if (res.previewResetToken) {
        setPreviewResetToken(res.previewResetToken);
        setResetToken(res.previewResetToken);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to prepare reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      setInfo('Password updated. You can now sign in with your new password.');
      setPreviewResetToken(null);
      setMode('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Authentication"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      onClick={onClose}
    >
      <div
        className="glass-surface w-full max-w-md rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">
              {mode === 'login' && 'Welcome back to SkillPath AI'}
              {mode === 'register' && 'Create your SkillPath account'}
              {mode === 'verify' && 'Verify your email'}
              {mode === 'reset' && 'Reset your password'}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Persistent roadmaps, interactive skill trees, and personalized mentor sessions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {(mode === 'login' || mode === 'register') && (
          <div className="mt-4 grid grid-cols-2 rounded-xl bg-black/5 dark:bg-white/5 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-white dark:bg-[#101018] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
                mode === 'register'
                  ? 'bg-white dark:bg-[#101018] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300"
          >
            {error}
          </div>
        )}
        {info && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
            {info}
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0A0A10] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset');
                    setError(null);
                    setInfo(null);
                  }}
                  className="text-xs text-[#6366F1] dark:text-[#38BDF8] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0A0A10] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B5CF6] py-2.5 text-sm font-semibold text-white hover:bg-[#7C3AED] disabled:opacity-60 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="mt-5 space-y-4">
            <div>
              <label htmlFor="reg-name" className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Full name
              </label>
              <input
                id="reg-name"
                type="text"
                required
                minLength={2}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Rivera"
                className="mt-1.5 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0A0A10] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="reg-email" className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Email address
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="mt-1.5 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0A0A10] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Password (minimum 8 characters)
              </label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className="mt-1.5 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0A0A10] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B5CF6] py-2.5 text-sm font-semibold text-white hover:bg-[#7C3AED] disabled:opacity-60 transition-colors"
            >
              {loading ? 'Creating account...' : 'Create Account & Personalize'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {mode === 'verify' && (
          <form onSubmit={handleVerifyEmail} className="mt-5 space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3 text-xs text-slate-600 dark:text-zinc-300">
              <Mail className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
              <div>
                Enter the 6-digit verification code for your account.
                {previewCode && (
                  <div className="mt-1 font-mono text-slate-900 dark:text-white">
                    Local preview code: <strong>{previewCode}</strong>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="verify-code" className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                Verification code
              </label>
              <input
                id="verify-code"
                type="text"
                required
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="6-digit code"
                className="mt-1.5 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0A0A10] px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B5CF6] py-2.5 text-sm font-semibold text-white hover:bg-[#7C3AED]"
              >
                <CheckCircle2 className="w-4 h-4" />
                Verify Email
              </button>
              {pendingUser && (
                <button
                  type="button"
                  onClick={() => onAuthenticated(pendingUser, true)}
                  className="rounded-xl border border-black/10 dark:border-white/10 px-4 py-2.5 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Verify Later
                </button>
              )}
            </div>
          </form>
        )}

        {mode === 'reset' && (
          <div className="mt-5 space-y-4">
            {!previewResetToken ? (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Account email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1.5 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0A0A10] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#8B5CF6] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B5CF6] py-2.5 text-sm font-semibold text-white hover:bg-[#7C3AED]"
                >
                  <KeyRound className="w-4 h-4" />
                  Request Reset Token
                </button>
              </form>
            ) : (
              <form onSubmit={handleCompleteReset} className="space-y-4">
                <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3 font-mono text-xs text-slate-700 dark:text-zinc-300">
                  Preview reset token: {previewResetToken}
                </div>
                <div>
                  <label htmlFor="reset-token" className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Reset token
                  </label>
                  <input
                    id="reset-token"
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0A0A10] px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="reset-new-pw" className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    New password
                  </label>
                  <input
                    id="reset-new-pw"
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0A0A10] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#8B5CF6] py-2.5 text-sm font-semibold text-white hover:bg-[#7C3AED]"
                >
                  Update Password
                </button>
              </form>
            )}
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

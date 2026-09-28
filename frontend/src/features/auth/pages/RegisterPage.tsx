import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { ApiError } from '../../../shared/api/ApiError';
import { AlertCircle, Loader2 } from 'lucide-react';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const newFieldErrors: Record<string, string> = {};
    if (!username.trim()) {
      newFieldErrors.username = 'Username is required';
    }
    if (!email.trim()) {
      newFieldErrors.email = 'Email is required';
    }
    if (!password) {
      newFieldErrors.password = 'Password is required';
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await register({ username, email, password });
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('An account with this email already exists.');
        } else if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors(err.fieldErrors);
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create an account</h1>
        <p className="text-slate-500 text-sm mt-1">Get started with DataFlowX today</p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="username" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Username <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="johndoe"
            disabled={isSubmitting}
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.username)}
            aria-describedby={fieldErrors.username ? 'username-error' : undefined}
            className={`w-full px-4 py-3 rounded-lg border text-sm transition focus-visible:outline-none focus-visible:ring-2 ${
              fieldErrors.username
                ? 'border-red-300 focus-visible:ring-red-500 focus-visible:border-red-500'
                : 'border-slate-200 focus-visible:ring-brand-500 focus-visible:border-brand-500'
            }`}
          />
          {fieldErrors.username && (
            <p id="username-error" role="alert" className="text-xs text-red-600 mt-1">
              {fieldErrors.username}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Email address <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            disabled={isSubmitting}
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            className={`w-full px-4 py-3 rounded-lg border text-sm transition focus-visible:outline-none focus-visible:ring-2 ${
              fieldErrors.email
                ? 'border-red-300 focus-visible:ring-red-500 focus-visible:border-red-500'
                : 'border-slate-200 focus-visible:ring-brand-500 focus-visible:border-brand-500'
            }`}
          />
          {fieldErrors.email && (
            <p id="email-error" role="alert" className="text-xs text-red-600 mt-1">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Password <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isSubmitting}
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            className={`w-full px-4 py-3 rounded-lg border text-sm transition focus-visible:outline-none focus-visible:ring-2 ${
              fieldErrors.password
                ? 'border-red-300 focus-visible:ring-red-500 focus-visible:border-red-500'
                : 'border-slate-200 focus-visible:ring-brand-500 focus-visible:border-brand-500'
            }`}
          />
          {fieldErrors.password && (
            <p id="password-error" role="alert" className="text-xs text-red-600 mt-1">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-lg bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition flex items-center justify-center gap-2 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Creating account...</span>
            </>
          ) : (
            <span>Register</span>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-brand-600 font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}

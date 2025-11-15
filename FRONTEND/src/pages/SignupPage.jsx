import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function SignupPage() {
  const { signup } = useAuth();
  const { darkMode } = useTheme();
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const password = watch('password', '');
  const strengthChecks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
  ];
  const strengthPassed = strengthChecks.filter((c) => c.pass).length;

  const onSubmit = async (data) => {
    setApiError('');
    setLoading(true);
    try {
      await signup(data.name, data.email, data.password);
    } catch (err) {
      setApiError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 to-teal-700 relative overflow-hidden">
        <div className="absolute top-16 right-16 w-24 h-24 border-2 border-white/15 rounded-full" />
        <div className="absolute bottom-24 left-12 w-16 h-16 border-2 border-white/10 rounded-lg rotate-12" />
        <div className="absolute top-2/3 right-24 w-6 h-6 bg-white/10 rounded-full" />

        <div className="flex flex-col justify-center px-16 relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center font-bold text-white text-lg">$</div>
            <span className="text-white font-bold text-xl tracking-tight">SPW</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Start tracking<br />your wealth today
          </h2>
          <p className="text-emerald-100/80 text-sm max-w-sm">
            Create an account and get instant access to projections, scenario modeling, and AI-powered insights.
          </p>
          <div className="mt-10 space-y-3">
            {['AI financial assistant', 'What-if scenario modeling', 'PDF report exports'].map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span className="text-emerald-100 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg ${darkMode ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-600 text-white'}`}>$</div>
            <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>SPW</span>
          </div>

          <h1 className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Create account</h1>
          <p className={`text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Get started in under a minute</p>

          {apiError && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Full Name</label>
              <input
                type="text"
                {...register('name', { required: 'Name is required' })}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                }`}
                placeholder="John Doe"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Email</label>
              <input
                type="email"
                {...register('email', { required: 'Email is required' })}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                }`}
                placeholder="you@email.com"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Password</label>
              <input
                type="password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Minimum 8 characters' },
                })}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                }`}
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}

              {/* Strength meter */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i < strengthPassed
                            ? strengthPassed === 3 ? 'bg-emerald-500' : strengthPassed === 2 ? 'bg-yellow-500' : 'bg-red-500'
                            : darkMode ? 'bg-slate-700' : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {strengthChecks.map((c) => (
                      <span key={c.label} className={`text-[10px] ${c.pass ? 'text-emerald-400' : darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {c.pass ? '✓' : '○'} {c.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className={`text-sm mt-6 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-500 hover:text-emerald-400 font-medium">Sign in</Link>
          </p>

          <p className={`text-[11px] mt-8 text-center ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
            Final Year Software Engineering Project &middot; 2026
          </p>
        </div>
      </div>
    </div>
  );
}

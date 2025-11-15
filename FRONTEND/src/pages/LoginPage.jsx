import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { darkMode } = useTheme();
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setApiError('');
    setLoading(true);
    try {
      await login(data.email, data.password);
    } catch (err) {
      setApiError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 relative overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute top-12 left-12 w-20 h-20 border-2 border-white/20 rounded-lg rotate-12" />
        <div className="absolute bottom-20 right-16 w-32 h-32 border-2 border-white/10 rounded-full" />
        <div className="absolute top-1/3 right-20 w-8 h-8 bg-white/10 rounded-md rotate-45" />

        <div className="flex flex-col justify-center px-16 relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center font-bold text-white text-lg">$</div>
            <span className="text-white font-bold text-xl tracking-tight">SPW</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Smart Personal<br />Wealth Dashboard
          </h2>
          <p className="text-blue-100/80 text-sm max-w-sm">
            Track your accounts, model what-if scenarios, and get AI-powered financial insights — all in one place.
          </p>
          <div className="mt-10 space-y-3">
            {['Multi-currency tracking', 'Monte Carlo projections', 'FIRE calculator'].map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                <span className="text-blue-100 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg ${darkMode ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-600 text-white'}`}>$</div>
            <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>SPW</span>
          </div>

          <h1 className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Welcome back</h1>
          <p className={`text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Sign in to your account</p>

          {apiError && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Email</label>
              <input
                type="email"
                {...register('email', { required: 'Email is required' })}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
                }`}
                placeholder="you@email.com"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Password</label>
              <input
                type="password"
                {...register('password', { required: 'Password is required' })}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
                }`}
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className={`text-sm mt-6 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-blue-500 hover:text-blue-400 font-medium">Sign up</Link>
          </p>

          <p className={`text-[11px] mt-8 text-center ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
            Final Year Software Engineering Project &middot; 2026
          </p>
        </div>
      </div>
    </div>
  );
}

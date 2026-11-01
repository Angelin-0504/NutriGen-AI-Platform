import React, { useState } from 'react';
import { 
  Lock, Mail, User as UserIcon, AlertCircle, Loader2, CheckCircle2, 
  ArrowRight, ShieldCheck, X, Eye, EyeOff 
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userData: any, token: string) => void;
  initialMode?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Password validation checks for register
  const isLengthValid = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim()) {
          setError('Please enter your full name.');
          setLoading(false);
          return;
        }
        if (!isLengthValid || !hasLetter || !hasNumber) {
          setError('Password must be at least 8 characters long and contain both letters and numbers.');
          setLoading(false);
          return;
        }
        if (!isMatch) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            confirm_password: confirmPassword
          })
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.detail || 'Registration failed. Please check your details.');
          setLoading(false);
          return;
        }

        onSuccess(data.user, data.token);
        onClose();
      } else {
        // Login mode: allow email or username
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password
          })
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.detail || 'Invalid username or password.');
          setLoading(false);
          return;
        }

        onSuccess(data.user, data.token);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setError('Network or server error occurred. Please verify the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-700 p-6 text-white text-center relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="inline-flex p-3 rounded-2xl bg-white/20 backdrop-blur-md mb-3 shadow-inner">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">
            {mode === 'login' ? 'Sign In to NutriGen AI' : 'Create NutriGen AI Account'}
          </h2>
          <p className="text-xs text-emerald-100 mt-1 font-medium">
            {mode === 'login' 
              ? 'Access your clinical nutrient profile, meal plans & digital twin' 
              : 'Secure, encrypted health data storage with personalized nutrition'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'login' 
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'register' 
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex gap-2.5 items-start text-rose-800 text-xs">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Arun Kumar"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {mode === 'login' ? 'Email or Username' : 'Email Address'} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type={mode === 'login' ? 'text' : 'email'}
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={mode === 'login' ? 'e.g. user@example.com or username' : 'e.g. user@example.com'}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                    className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password strength criteria */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-[11px]">
                <span className="font-bold text-slate-600 block mb-1">Security Requirements:</span>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <CheckCircle2 className={`h-3.5 w-3.5 ${isLengthValid ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>At least 8 characters long</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <CheckCircle2 className={`h-3.5 w-3.5 ${hasLetter && hasNumber ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Contains letters and numbers</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <CheckCircle2 className={`h-3.5 w-3.5 ${isMatch ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Passwords match</span>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span>Processing...</span>
                <Loader2 className="h-4 w-4 animate-spin" />
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In to Dashboard' : 'Create Secure Account'}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
          {mode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button 
                type="button" 
                onClick={() => { setMode('register'); setError(null); }} 
                className="text-emerald-700 font-bold hover:underline"
              >
                Create one now
              </button>
            </span>
          ) : (
            <span>
              Already registered?{' '}
              <button 
                type="button" 
                onClick={() => { setMode('login'); setError(null); }} 
                className="text-emerald-700 font-bold hover:underline"
              >
                Sign in to your account
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}


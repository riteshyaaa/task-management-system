import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Mail, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password', 'warning');
      return;
    }

    try {
      setLoading(true);
      await login({ email, password });
      showToast('Welcome back!', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Invalid email or password';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glow decorations */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-xl shadow-2xl z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-xl shadow-indigo-500/25 mb-4">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Welcome to OmniTask <Sparkles className="w-4 h-4 text-indigo-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-1">Enterprise-grade Task & Workflow Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Password123!"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
            Sign In
          </Button>
        </form>

        {/* Quick Demo Accounts Fill */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
            ⚡ Quick Demo Logins (Click to Autofill)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail('admin@example.com');
                setPassword('Password123!');
              }}
              className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-left transition-all group"
            >
              <span className="text-xs font-bold text-white group-hover:text-indigo-300 block">👑 Admin</span>
              <span className="text-[10px] text-slate-500 truncate block">admin@example.com</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('manager@example.com');
                setPassword('Password123!');
              }}
              className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-left transition-all group"
            >
              <span className="text-xs font-bold text-white group-hover:text-indigo-300 block">💼 Manager</span>
              <span className="text-[10px] text-slate-500 truncate block">manager@example.com</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('dev@example.com');
                setPassword('Password123!');
              }}
              className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-left transition-all group"
            >
              <span className="text-xs font-bold text-white group-hover:text-indigo-300 block">💻 Developer</span>
              <span className="text-[10px] text-slate-500 truncate block">dev@example.com</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('qa@example.com');
                setPassword('Password123!');
              }}
              className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-left transition-all group"
            >
              <span className="text-xs font-bold text-white group-hover:text-indigo-300 block">🔍 QA Tester</span>
              <span className="text-[10px] text-slate-500 truncate block">qa@example.com</span>
            </button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

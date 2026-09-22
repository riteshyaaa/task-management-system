import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Layers,
  Mail,
  Lock,
  Sparkles,
  Shield,
  Briefcase,
  Code,
  CheckCircle2,
  BarChart3,
  Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface DemoAccount {
  role: string;
  name: string;
  email: string;
  password: string;
  icon: React.ElementType;
  badgeClass: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'Admin',
    name: 'System Admin',
    email: 'admin@example.com',
    password: 'Password123!',
    icon: Shield,
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30'
  },
  {
    role: 'Manager 1',
    name: 'Alice Johnson',
    email: 'manager@example.com',
    password: 'Password123!',
    icon: Briefcase,
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  },
  {
    role: 'Manager 2',
    name: 'Bob Smith',
    email: 'manager2@example.com',
    password: 'Password123!',
    icon: Briefcase,
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  },
  {
    role: 'Member 1 (Dev)',
    name: 'David Developer',
    email: 'dev@example.com',
    password: 'Password123!',
    icon: Code,
    badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
  },
  {
    role: 'Member 2 (QA)',
    name: 'Eva Tester',
    email: 'qa@example.com',
    password: 'Password123!',
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  },
  {
    role: 'Member 3 (Analyst)',
    name: 'Charlie Analyst',
    email: 'charlie@example.com',
    password: 'Password123!',
    icon: BarChart3,
    badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
  },
  {
    role: 'Member 4 (Specialist)',
    name: 'Diana Prince',
    email: 'diana@example.com',
    password: 'Password123!',
    icon: Sparkles,
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30'
  }
];

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleAutofill = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword(acc.password);
    showToast(`Autofilled credentials for ${acc.role}`, 'info');
  };

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

      <div className="w-full max-w-lg bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl z-10 my-8">
        <div className="flex flex-col items-center text-center mb-6">
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
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Demo Credentials (Click to Autofill)
            </p>
            <span className="text-[10px] text-slate-500 font-mono">Password: Password123!</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              const isSelected = email === acc.email;
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleAutofill(acc)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500/60 shadow-sm shadow-indigo-500/20'
                      : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5 text-slate-300">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-semibold text-white truncate">{acc.role}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${acc.badgeClass}`}>
                        {acc.role.split(' ')[0]}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 truncate block font-mono">
                      {acc.email}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800 text-center">
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

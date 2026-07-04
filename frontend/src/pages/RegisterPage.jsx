import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const passwordRules = [
  { label: 'At least 8 characters', test: p => p.length >= 8 },
  { label: 'One uppercase letter (A-Z)', test: p => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a-z)', test: p => /[a-z]/.test(p) },
  { label: 'One number (0-9)', test: p => /[0-9]/.test(p) },
  { label: 'One special character (!@#$%^&*)', test: p => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) }
];

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const allRulesPassed = passwordRules.every(r => r.test(password));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allRulesPassed) return toast.error('Password does not meet all requirements');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/register', { email, password });
      login(data.user, data.token);
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (err) {
      const details = err.response?.data?.details;
      if (details && details.length > 0) {
        details.forEach(d => toast.error(d));
      } else {
        toast.error(err.response?.data?.error || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Create account</h1>
        <p className="text-gray-500 mb-6">Start analyzing your resume today</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setShowRules(true); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Create a strong password"
              required
            />
            {showRules && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                <p className="text-xs font-medium text-gray-600 mb-2">Password requirements:</p>
                {passwordRules.map((rule, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs mb-1">
                    <span className={rule.test(password) ? 'text-green-500' : 'text-gray-400'}>
                      {rule.test(password) ? '✓' : '○'}
                    </span>
                    <span className={rule.test(password) ? 'text-green-600' : 'text-gray-500'}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !allRulesPassed}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

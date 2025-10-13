import React, { useEffect, useState } from 'react';
import transporterService from '../services/databaseService';
import { toast } from 'sonner';

interface Props {
  onLogin: (user: any) => void;
}

export default function TransporterLogin({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState(transporterService.getConnectionStatus());

  useEffect(() => {
    const id = setInterval(() => setStatus(transporterService.getConnectionStatus()), 3000);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setChecking(true);
    try {
      const user = await transporterService.login(username, password);
      if (user && user.role === 'employee' && user.department === 'Transporter') {
        localStorage.setItem('currentUser', JSON.stringify(user));
        onLogin(user);
        toast.success(`Welcome ${user.name || user.username}`);
      } else if (user) {
        setError('Only employees in Transporter department can access');
        toast.error('Only employees in Transporter department can access');
      } else {
        setError('Invalid username or password');
        toast.error('Invalid username or password');
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-4 flex gap-2 text-xs">
          <span className={`px-2.5 py-1 rounded border ${status.isOnline ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
            {status.isOnline ? 'Online' : 'Offline'}
          </span>
          <span className={`px-2.5 py-1 rounded border ${status.isDatabaseConnected ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
            {status.isDatabaseConnected ? 'DB Connected' : 'Local Mode'}
          </span>
        </div>
        <div className="card p-6 shadow-sm">
          <div className="mb-4">
            <h1 className="text-2xl font-semibold">Transporter Panel</h1>
            <p className="text-sm text-gray-600 mt-1">Sign in to submit outside job work</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Username</label>
              <input className="input" value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="Enter username" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Enter password" required />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <button className="btn w-full" disabled={checking}>
              {checking ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="mt-3 text-xs text-gray-500">Only Transporter department accounts can access this panel.</div>
        </div>
      </div>
    </div>
  );
}

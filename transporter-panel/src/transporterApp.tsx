import React, { useMemo, useState } from 'react';
import { TransporterForm } from './components/TransporterForm';
import TransporterLogin from './components/TransporterLogin';
import { Toaster } from 'sonner';

export default function App() {
  const [done, setDone] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('authToken') || '');
  const [user, setUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('currentUser') || '{}'); } catch { return {}; }
  });

  const handleLoggedIn = (u: any) => {
    setUser(u);
    setToken(localStorage.getItem('authToken') || '');
  };

  const canAccess = Boolean(token && user?.id && user?.role === 'employee' && user?.department === 'Transporter');

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    setToken('');
    setUser(null);
  };

  if (!canAccess) {
    return (
      <>
        <TransporterLogin onLogin={handleLoggedIn} />
        <Toaster position="top-center" />
      </>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transporter Panel</h1>
          <p className="text-sm text-gray-600">Outside Job Work (Rod / Pin)</p>
          <p className="text-xs text-gray-500 mt-1">Logged in as: <span className="font-medium">{user?.name || user?.username}</span></p>
        </div>
        <button onClick={handleLogout} className="btn btn-outline text-sm">Logout</button>
      </div>
      <div className="card p-4 mt-4">
        <TransporterForm employeeId={user.id} employeeName={user.name || 'Transporter'} onComplete={() => setDone(!done)} />
      </div>
      <Toaster position="top-center" />
    </div>
  );
}

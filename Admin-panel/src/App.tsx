import { useState, useEffect } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { LoginForm } from './components/LoginForm';
import { apiService } from './services/api';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'employee';
  name: string;
  department?: string;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          // Verify token with backend
          const me = await apiService.verifyToken();
          const user = { ...me.data!.user, token: parsed.token } as User;
          setCurrentUser(user);
          localStorage.setItem('currentUser', JSON.stringify(user));
        } catch {
          localStorage.removeItem('currentUser');
          setCurrentUser(null);
        }
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <ErrorBoundary>
        <AdminDashboard user={currentUser} onLogout={handleLogout} />
      </ErrorBoundary>
    </div>
  );
}
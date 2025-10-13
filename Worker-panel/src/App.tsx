import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { EnhancedEmployeePortal } from './components/employee/EnhancedEmployeePortal';
import { EnhancedLoginForm } from './components/employee/EnhancedLoginForm';
import { Toaster } from './components/ui/sonner';
import { useServiceWorker } from './hooks/useServiceWorker';
import databaseService from './services/databaseService';

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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();
  
  // Register service worker for offline functionality
  useServiceWorker();

  useEffect(() => {
    // Check for existing login in localStorage (employee only)
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        if (user.role === 'employee') {
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('currentUser');
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Online/offline status monitoring
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = (user: User) => {
    if (user.role === 'employee') {
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      navigate('/work', { replace: true });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    // Clear any auto-saved drafts on logout
    localStorage.removeItem('workDraft');
    navigate('/login', { replace: true });
  };

  // Heartbeat: verify session server-side to catch deactivated status
  useEffect(() => {
    if (!currentUser) return;
    let timer: any;
    const verify = async () => {
      const result = await databaseService.verifySession();
      if (!result.valid) {
        handleLogout();
        // Optional: surface a light notification via alert for now
        alert(result.reason === 'deactivated' 
          ? 'Your account has been deactivated by admin.'
          : 'Your session is no longer valid. Please log in again.');
      }
    };
    // Run immediately and then every 60s while online
    verify();
    timer = setInterval(verify, 60000);
    return () => clearInterval(timer);
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="w-12 h-12 border-4 border-transparent border-t-blue-400 rounded-full animate-spin absolute top-2 left-1/2 transform -translate-x-1/2"></div>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-gray-700">Loading Employee Portal</h3>
            <p className="text-sm text-gray-500">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route 
          path="/login" 
          element={
            currentUser ? <Navigate to="/work" replace /> : <EnhancedLoginForm onLogin={handleLogin} isOnline={isOnline} />
          } 
        />
        <Route 
          path="/work" 
          element={
            currentUser ? (
              <EnhancedEmployeePortal 
                user={currentUser}
                onLogout={handleLogout}
                isOnline={isOnline}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to={currentUser ? '/work' : '/login'} replace />} />
      </Routes>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--card)',
            color: 'var(--card-foreground)',
            border: '1px solid var(--border)',
          },
        }}
      />
    </>
  );
}
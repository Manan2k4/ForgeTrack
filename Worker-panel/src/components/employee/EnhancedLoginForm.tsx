import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Lock, Wifi, WifiOff, Smartphone, Database, DatabaseZap } from 'lucide-react';
import databaseService from '../../services/databaseService';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'employee';
  name: string;
  department?: string;
}

interface EnhancedLoginFormProps {
  onLogin: (user: User) => void;
  isOnline: boolean;
}

export function EnhancedLoginForm({ onLogin, isOnline }: EnhancedLoginFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({ isOnline: true, isDatabaseConnected: false });

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Check database connection status
    const checkConnection = () => {
      const status = databaseService.getConnectionStatus();
      setConnectionStatus(status);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000); // Check every 5 seconds
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Load remembered credentials
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    if (rememberedUsername) {
      setFormData(prev => ({ ...prev, username: rememberedUsername }));
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Mobile haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    try {
      // Use the database service for authentication
      const user = await databaseService.login(formData.username, formData.password);

      if (user) {
        // Handle remember me
        if (rememberMe) {
          localStorage.setItem('rememberedUsername', formData.username);
        } else {
          localStorage.removeItem('rememberedUsername');
        }

        toast.success(`Welcome back, ${user.name}!`, {
          icon: '👋',
        });

        onLogin(user);
      } else {
        setError('Invalid username or password');
        toast.error('Login failed. Please check your credentials.');
        
        // Error haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
      }
    } catch (error) {
      setError('Login failed. Please try again.');
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Demo login removed to avoid bypassing deactivated accounts

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Connection Status */}
        <div className="mb-4 space-y-2">
          <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
            connectionStatus.isOnline 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-orange-50 text-orange-700 border border-orange-200'
          }`}>
            {connectionStatus.isOnline ? (
              <>
                <Wifi className="w-4 h-4" />
                <span>Internet Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Offline Mode</span>
              </>
            )}
          </div>
          
          <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
            connectionStatus.isDatabaseConnected
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-gray-50 text-gray-700 border border-gray-200'
          }`}>
            {connectionStatus.isDatabaseConnected ? (
              <>
                <DatabaseZap className="w-4 h-4" />
                <span>Database Connected</span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>Local Storage Mode</span>
              </>
            )}
          </div>
        </div>

        <Card className="shadow-xl border-0 backdrop-blur-sm bg-white/90">
          <CardHeader className="space-y-4 text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              {isMobile ? (
                <Smartphone className="w-8 h-8 text-white" />
              ) : (
                <User className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <CardTitle className="text-2xl">Employee Portal</CardTitle>
              <CardDescription className="text-base mt-2">
                Sign in to log your work and track progress
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="h-12 text-base pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-sm cursor-pointer">
                  Remember username
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Demo login intentionally disabled in production builds */}

            {/* Login Help */}
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Demo credentials: <code className="bg-gray-100 px-2 py-1 rounded text-xs">demo / employee123</code>
              </p>
              {!connectionStatus.isDatabaseConnected && (
                <p className="text-xs text-orange-600">
                  {connectionStatus.isOnline 
                    ? 'Database unavailable - using local storage' 
                    : 'Offline mode - data will sync when connected'
                  }
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mobile-specific footer */}
        {isMobile && (
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Optimized for mobile • Pull to refresh • Auto-save enabled</p>
          </div>
        )}
      </div>
    </div>
  );
}
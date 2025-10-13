import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { apiService } from '../services/api';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'employee';
  name: string;
  department?: string;
  token?: string;
}

interface LoginFormProps {
  onLogin: (user: Omit<User, 'password'>) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const loginHint = (import.meta as any)?.env?.VITE_LOGIN_HINT as string | undefined;

  useEffect(() => {
    // Try to initialize backend admin if not present
    apiService.initAdmin().catch(() => {/* ignore if already exists */});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const resp = await apiService.login(username, password);
      const { user, token } = resp.data!;
      const userData: User = { ...user, token };
      localStorage.setItem('currentUser', JSON.stringify(userData));
      onLogin(userData);
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            {error && (
              <div className="text-destructive text-sm">{error}</div>
            )}
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
          {loginHint && (
            <div className="mt-4 text-sm text-muted-foreground">
              <p>{loginHint}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
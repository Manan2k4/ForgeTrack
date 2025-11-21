import { buildUrl, checkDatabaseConnection } from '../config/database';
import { toast } from 'sonner';

// Types
interface User {
  id: string;
  username: string;
  role: 'admin' | 'employee';
  name: string;
  department?: string;
}

interface Product {
  id: string;
  type: 'sleeve' | 'rod' | 'pin';
  code?: string;
  partName?: string;
  sizes: string[];
}

interface WorkLog {
  id: string;
  employeeId: string;
  employeeName: string;
  jobType: 'rod' | 'sleeve' | 'pin';
  code?: string;
  partName?: string;
  partSize: string;
  operation?: string;
  totalParts: number;
  rejection?: number;
  date: string;
  timestamp: string;
  offline?: boolean;
}

// Database Service Class
class DatabaseService {
  private isOnline: boolean = navigator.onLine;
  private isDatabaseConnected: boolean = false;
  private syncQueue: any[] = [];

  constructor() {
    this.checkConnection();
    this.setupConnectionMonitoring();
  }

  // Connection Management
  private async checkConnection(): Promise<void> {
    try {
      this.isDatabaseConnected = await checkDatabaseConnection();
      if (this.isDatabaseConnected) {
        console.log('✅ Database connection established');
        this.processSyncQueue();
      } else {
        console.log('📱 Using offline mode - data will sync when connected');
      }
    } catch (error) {
      console.log('Database connection failed, using offline mode');
      this.isDatabaseConnected = false;
    }
  }

  private setupConnectionMonitoring(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.checkConnection();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.isDatabaseConnected = false;
    });

    // Periodic connection check
    setInterval(() => {
      if (this.isOnline) {
        this.checkConnection();
      }
    }, 30000); // Check every 30 seconds
  }

  // Authentication
  async login(username: string, password: string): Promise<User | null> {
    if (this.isDatabaseConnected) {
      try {
        const response = await fetch(buildUrl('/auth/login'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
          const json = await response.json();
          const { user, token } = json.data || {};
          if (token) {
            localStorage.setItem('authToken', token);
          }
          if (user) {
            this.cacheUser(user);
            // Auto populate currentUser for future auto-login reuse
            localStorage.setItem('currentUser', JSON.stringify(user));
            return user;
          }
          return null;
        } else {
          // Do NOT fallback when server explicitly rejects (e.g., deactivated)
          return null;
        }
      } catch (error) {
        console.log('Network login failed, trying local authentication');
        return this.localLogin(username, password);
      }
    } else {
      return this.localLogin(username, password);
    }
  }

  // Verify session token with backend and detect deactivated accounts
  async verifySession(): Promise<{ valid: boolean; reason?: string }> {
    const token = this.getAuthToken();
    if (!token) return { valid: false, reason: 'no-token' };
    if (!this.isDatabaseConnected) return { valid: true };
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(buildUrl('/auth/me'), {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) return { valid: true };
      // 401 invalid or expired, 403 deactivated
      if (res.status === 403) return { valid: false, reason: 'deactivated' };
      return { valid: false, reason: 'invalid' };
    } catch (e) {
      // Network issue: keep session, will re-check later
      return { valid: true };
    }
  }

  private localLogin(username: string, password: string): User | null {
    // Strict offline fallback: require an exact match on a cached user with a temporary plaintext password store
    // If no password is cached (we don't store password normally), block login to avoid bypassing deactivation
    const cached = JSON.parse(localStorage.getItem('offlineUsers') || '[]');
    const match = cached.find((u: any) => u.username === username && u.password === password && u.role === 'employee');
    return match ? { id: match.id, username: match.username, role: 'employee', name: match.name, department: match.department } : null;
  }

  private cacheUser(user: User): void {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const existingUserIndex = users.findIndex((u: User) => u.id === user.id);
    
    if (existingUserIndex >= 0) {
      users[existingUserIndex] = user;
    } else {
      users.push(user);
    }
    
    localStorage.setItem('users', JSON.stringify(users));
  }

  // Products
  async getProducts(type?: string): Promise<Product[]> {
    if (this.isDatabaseConnected) {
      try {
        const url = type ? buildUrl(`/products?type=${type}`) : buildUrl('/products');
        const token = this.getAuthToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const response = await fetch(url, { headers });

        if (response.ok) {
          const json = await response.json();
          const products = json.data || [];
          // Cache products locally
          this.cacheProducts(products);
          return type ? products.filter((p: Product) => p.type === type) : products;
        }
      } catch (error) {
        console.log('Network request failed, using cached products');
      }
    }

    // Fallback to local storage
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    return type ? products.filter((p: Product) => p.type === type) : products;
  }

  private cacheProducts(products: Product[]): void {
    localStorage.setItem('products', JSON.stringify(products));
  }

  // Work Logs
  async saveWorkLog(workLog: Omit<WorkLog, 'id' | 'timestamp'>): Promise<WorkLog> {
    // Attempt online save using backend contract (productId, partSize, totalParts, rejection)
    if (this.isDatabaseConnected) {
      try {
        // Map to productId using cached products
        const products: Product[] = await this.getProducts(workLog.jobType);
        let product: Product | undefined;
        if (workLog.jobType === 'sleeve' && workLog.code) {
          product = products.find(p => p.code === workLog.code);
        } else if ((workLog.jobType === 'rod' || workLog.jobType === 'pin') && workLog.partName) {
          product = products.find(p => p.partName === workLog.partName);
        }

        if (!product) {
          throw new Error('Matching product not found for work log');
        }

        const response = await fetch(buildUrl('/work-logs'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken()}`,
          },
          body: JSON.stringify({
            productId: (product as any)._id || (product as any).id,
            partSize: workLog.partSize,
            operation: (workLog as any).operation,
            totalParts: workLog.totalParts,
            rejection: workLog.rejection || 0,
          }),
        });

        if (response.ok) {
          const json = await response.json();
          const saved = json.data || {};
          // Normalize and cache
          const normalized: WorkLog = {
            id: saved.id || saved._id || Date.now().toString(),
            employeeId: saved.employeeId || workLog.employeeId,
            employeeName: saved.employeeName || workLog.employeeName,
            jobType: saved.jobType || workLog.jobType,
            code: saved.code,
            partName: saved.partName,
            partSize: saved.partSize || workLog.partSize,
            operation: (saved as any).operation || (workLog as any).operation,
            totalParts: saved.totalParts ?? saved.quantity ?? workLog.totalParts,
            rejection: saved.rejection ?? workLog.rejection ?? 0,
            date: saved.date || saved.workDate || new Date().toISOString().split('T')[0],
            timestamp: saved.timestamp || new Date().toISOString(),
          };
          this.cacheWorkLog(normalized);
          return normalized;
        }
      } catch (error) {
        console.log('Failed to save to database, queuing for sync');
        // fall through to offline
      }
    }

    // Offline/local save path
    const fullWorkLog: WorkLog = {
      ...workLog,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      offline: true,
    } as any;

    this.addToSyncQueue('workLog', fullWorkLog);
    this.cacheWorkLog(fullWorkLog);
    return fullWorkLog;
  }

  async getWorkLogs(employeeId?: string): Promise<WorkLog[]> {
    if (this.isDatabaseConnected) {
      try {
        const url = employeeId 
          ? buildUrl(`/work-logs?employee=${employeeId}`)
          : buildUrl('/work-logs');
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
          },
        });

        if (response.ok) {
          const json = await response.json();
          const workLogs = json.data || [];
          // Update local cache
          this.cacheWorkLogs(workLogs);
          return employeeId 
            ? workLogs.filter((log: WorkLog) => log.employeeId === employeeId)
            : workLogs;
        }
      } catch (error) {
        console.log('Network request failed, using cached work logs');
      }
    }

    // Fallback to local storage
    const workLogs = JSON.parse(localStorage.getItem('workLogs') || '[]');
    return employeeId 
      ? workLogs.filter((log: WorkLog) => log.employeeId === employeeId)
      : workLogs;
  }

  private cacheWorkLog(workLog: WorkLog): void {
    const workLogs = JSON.parse(localStorage.getItem('workLogs') || '[]');
    const existingIndex = workLogs.findIndex((log: WorkLog) => log.id === workLog.id);
    
    if (existingIndex >= 0) {
      workLogs[existingIndex] = workLog;
    } else {
      workLogs.push(workLog);
    }
    
    localStorage.setItem('workLogs', JSON.stringify(workLogs));
  }

  private cacheWorkLogs(workLogs: WorkLog[]): void {
    localStorage.setItem('workLogs', JSON.stringify(workLogs));
  }

  // Sync Queue Management
  private addToSyncQueue(type: string, data: any): void {
    this.syncQueue.push({ type, data, timestamp: Date.now() });
    localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
  }

  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.length === 0) {
      // Load from localStorage
      this.syncQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
    }

    if (this.syncQueue.length === 0) return;

    console.log(`🔄 Syncing ${this.syncQueue.length} items...`);

    const failedItems: any[] = [];

    for (const item of this.syncQueue) {
      try {
        if (item.type === 'workLog') {
          const response = await fetch(buildUrl('/work-logs'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.getAuthToken()}`,
            },
            body: JSON.stringify(item.data),
          });

          if (!response.ok) {
            failedItems.push(item);
          }
        }
      } catch (error) {
        failedItems.push(item);
      }
    }

    // Update sync queue with failed items
    this.syncQueue = failedItems;
    localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));

    if (failedItems.length === 0) {
      toast.success('All data synced successfully!', {
        icon: '🔄',
      });
    } else {
      console.log(`${failedItems.length} items failed to sync`);
    }
  }

  // Utility Methods
  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }

  public getConnectionStatus(): { isOnline: boolean; isDatabaseConnected: boolean } {
    return {
      isOnline: this.isOnline,
      isDatabaseConnected: this.isDatabaseConnected,
    };
  }

  public getSyncQueueLength(): number {
    return this.syncQueue.length;
  }

  // Manual sync trigger
  public async forceSync(): Promise<void> {
    if (this.isDatabaseConnected) {
      await this.processSyncQueue();
    } else {
      toast.error('Cannot sync - no database connection');
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
export default databaseService;
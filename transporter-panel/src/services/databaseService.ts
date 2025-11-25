import { buildUrl, checkDatabaseConnection } from '../config/database';

export type TransportJob = 'outside-rod' | 'outside-pin' | 'outside-sleeve';

interface TransportLog {
  id: string;
  employeeId: string;
  employeeName: string;
  jobType: TransportJob;
  partyName: string;
  partName: string; // newly added for traceability
  totalParts: number;
  rejection?: number;
  weight?: number; // Weight in Kgs
  date: string;
  timestamp: string;
  offline?: boolean;
}

class TransporterService {
  private isOnline = navigator.onLine;
  private isDatabaseConnected = false;
  private syncQueue: any[] = [];

  constructor() {
    this.checkConnection();
    window.addEventListener('online', () => { this.isOnline = true; this.checkConnection(); });
    window.addEventListener('offline', () => { this.isOnline = false; this.isDatabaseConnected = false; });
    setInterval(() => { if (this.isOnline) this.checkConnection(); }, 30000);
  }

  private async checkConnection() {
    this.isDatabaseConnected = await checkDatabaseConnection();
    if (this.isDatabaseConnected) this.processSyncQueue();
  }

  getConnectionStatus() { return { isOnline: this.isOnline, isDatabaseConnected: this.isDatabaseConnected }; }
  getSyncQueueLength() { return this.syncQueue.length; }

  private getAuthToken(): string { return localStorage.getItem('authToken') || ''; }

  async login(username: string, password: string): Promise<any | null> {
    if (this.isDatabaseConnected) {
      try {
        const response = await fetch(buildUrl('/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        if (response.ok) {
          const json = await response.json();
          const { user, token } = json.data || {};
          if (token) localStorage.setItem('authToken', token);
          if (user) {
            // Cache current user and maintain an array cache similar to worker panel
            localStorage.setItem('currentUser', JSON.stringify(user));
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const idx = users.findIndex((u: any) => u.id === user.id);
            if (idx >= 0) users[idx] = user; else users.push(user);
            localStorage.setItem('users', JSON.stringify(users));
            return user;
          }
          return null;
        } else {
          // If server rejects (e.g. deactivated), do not allow fallback
          return null;
        }
      } catch (e) {
        // Network error -> strict offline fallback
        return this.localLogin(username, password);
      }
    } else {
      return this.localLogin(username, password);
    }
  }

  private localLogin(username: string, password: string): any | null {
    const cached = JSON.parse(localStorage.getItem('offlineUsers') || '[]');
    const match = cached.find((u: any) => u.username === username && u.password === password && (u.department === 'Transporter' || u.role === 'admin'));
    return match || null;
  }

  async saveTransportLog(log: Omit<TransportLog, 'id' | 'timestamp'>): Promise<TransportLog> {
    if (this.isDatabaseConnected) {
      try {
        const resp = await fetch(buildUrl('/transporter-logs'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getAuthToken()}` },
          body: JSON.stringify({
            jobType: log.jobType,
            partyName: log.partyName,
            partName: log.partName,
            totalParts: log.totalParts,
            rejection: log.rejection || 0,
            weight: log.weight || 0,
          }),
        });
        if (resp.ok) {
          const json = await resp.json();
          const saved = json.data || {};
          const normalized: TransportLog = {
            id: saved.id || Date.now().toString(),
            employeeId: log.employeeId,
            employeeName: log.employeeName,
            jobType: log.jobType,
            partyName: log.partyName,
            partName: log.partName,
            totalParts: log.totalParts,
            rejection: log.rejection || 0,
            weight: log.weight || 0,
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
          };
          this.cacheTransportLog(normalized);
          return normalized;
        }
      } catch {}
    }
    const offlineLog: TransportLog = { ...log, id: Date.now().toString(), timestamp: new Date().toISOString(), offline: true } as any;
    this.addToSyncQueue('transporterLog', offlineLog);
    this.cacheTransportLog(offlineLog);
    return offlineLog;
  }

  private cacheTransportLog(log: TransportLog) {
    const logs = JSON.parse(localStorage.getItem('transporterLogs') || '[]');
    logs.push(log);
    localStorage.setItem('transporterLogs', JSON.stringify(logs));
  }

  private addToSyncQueue(type: string, data: any) {
    this.syncQueue.push({ type, data, timestamp: Date.now() });
    localStorage.setItem('syncQueue_transport', JSON.stringify(this.syncQueue));
  }

  private async processSyncQueue() {
    if (this.syncQueue.length === 0) this.syncQueue = JSON.parse(localStorage.getItem('syncQueue_transport') || '[]');
    if (this.syncQueue.length === 0) return;
    const failures: any[] = [];
    for (const item of this.syncQueue) {
      try {
        if (item.type === 'transporterLog') {
          const r = await fetch(buildUrl('/transporter-logs'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getAuthToken()}` },
            body: JSON.stringify(item.data),
          });
          if (!r.ok) failures.push(item);
        }
      } catch { failures.push(item); }
    }
    this.syncQueue = failures;
    localStorage.setItem('syncQueue_transport', JSON.stringify(this.syncQueue));
  }
}

export const transporterService = new TransporterService();
export default transporterService;

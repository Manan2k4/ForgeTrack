const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: string[];
}

class ApiService {
  private getAuthToken(): string | null {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user?.token) return user.token;
      } catch {}
    }
    // Fallback to generic authToken (set by Worker/Transporter apps)
    return localStorage.getItem('authToken');
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        const details = [data.message, Array.isArray(data.errors) ? data.errors.join(', ') : '', data.error]
          .filter(Boolean)
          .join(' | ');
        throw new Error(details || `Request failed (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(username: string, password: string) {
    return this.request<{user: any, token: string}>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async initAdmin() {
    return this.request<any>('/auth/init', {
      method: 'POST',
    });
  }

  async verifyToken() {
    return this.request<{user: any}>('/auth/me');
  }

  // User endpoints
  async getEmployees(options?: { includeInactive?: boolean }) {
    const query = options?.includeInactive ? '?includeInactive=true' : '';
    return this.request<any[]>(`/users/employees${query}`);
  }

  async createEmployee(employeeData: {
    name: string;
    username: string;
    password: string;
    contact: string;
    address: string;
    department: string;
  }) {
    return this.request<any>('/users/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    });
  }

  async deleteEmployee(employeeId: string) {
    return this.request<any>(`/users/employees/${employeeId}`, {
      method: 'DELETE',
    });
  }

  async permanentDeleteEmployee(employeeId: string) {
    return this.request<any>(`/users/employees/${employeeId}/permanent`, {
      method: 'DELETE',
    });
  }

  async activateEmployee(employeeId: string) {
    return this.request<any>(`/users/employees/${employeeId}/activate`, {
      method: 'POST',
    });
  }

  async updateEmployee(
    employeeId: string,
    data: Partial<{
      name: string;
      username: string;
      password: string;
      contact: string;
      address: string;
      department: string;
    }>
  ) {
    return this.request<any>(`/users/employees/${employeeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async backfillEmployeeDepartments() {
    return this.request<any>('/users/employees/backfill-departments', {
      method: 'POST',
    });
  }

  // Product endpoints
  async getProducts(type?: string) {
    const query = type ? `?type=${type}` : '';
    return this.request<any[]>(`/products${query}`);
  }

  async createProduct(productData: {
    type: string;
    code?: string;
    partName?: string;
    sizes: string[];
  }) {
    return this.request<any>('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async updateProduct(productId: string, data: { sizes: string[]; code?: string; partName?: string }) {
    return this.request<any>(`/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(productId: string) {
    return this.request<any>(`/products/${productId}`, {
      method: 'DELETE',
    });
  }

  // Work log endpoints
  async getWorkLogs(filters?: {
    date?: string;
    employee?: string;
    jobType?: string;
  }) {
    const query = filters ? 
      '?' + Object.entries(filters)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}=${value}`)
        .join('&') : '';
    
    return this.request<any[]>(`/work-logs${query}`);
  }

  async createWorkLog(workLogData: {
    productId: string;
    partSize: string;
    totalParts: number;
    rejection?: number;
  }) {
    return this.request<any>('/work-logs', {
      method: 'POST',
      body: JSON.stringify(workLogData),
    });
  }

  async updateWorkLog(id: string, data: Partial<{ totalParts: number; rejection: number; partSize: string; operation: string | null }>) {
    return this.request<any>(`/work-logs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteWorkLog(id: string) {
    return this.request<any>(`/work-logs/${id}`, {
      method: 'DELETE',
    });
  }

  async getWorkLogStats(filters?: {
    date?: string;
    employee?: string;
    jobType?: string;
  }) {
    const query = filters ? 
      '?' + Object.entries(filters)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}=${value}`)
        .join('&') : '';
    
    return this.request<{
      totalLogs: number;
      totalParts: number;
      totalRejection: number;
      uniqueEmployeesCount: number;
    }>(`/work-logs/stats${query}`);
  }

  async getWorkLogsDaily(filters?: { date?: string; from?: string; to?: string; employee?: string; jobType?: string; }) {
    const query = filters ?
      '?' + Object.entries(filters)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}=${value}`)
        .join('&') : '';
    return this.request<Array<{ date: string; totalParts: number; totalRejection: number; okParts: number; count: number }>>(`/work-logs/daily${query}`);
  }

  async getWorkLogsByEmployee(filters?: { date?: string; from?: string; to?: string; jobType?: string; }) {
    const query = filters ?
      '?' + Object.entries(filters)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}=${value}`)
        .join('&') : '';
    return this.request<Array<{ employeeId: string; employeeName: string; totalParts: number; totalRejection: number; okParts: number; count: number }>>(`/work-logs/by-employee${query}`);
  }

  // Transporter log endpoints
  async getTransporterLogs(filters?: {
    date?: string;
    from?: string;
    to?: string;
    employee?: string;
    jobType?: string; // 'outside-rod' | 'outside-pin'
    partyName?: string;
  }) {
    const query = filters ?
      '?' + Object.entries(filters)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join('&') : '';
    return this.request<any[]>(`/transporter-logs${query}`);
  }

  async createTransporterLog(data: {
    jobType: 'outside-rod' | 'outside-pin';
    partyName: string;
    partName: string;
    totalParts: number;
    rejection?: number;
    workDate?: string; // YYYY-MM-DD
  }) {
    return this.request<any>('/transporter-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTransporterLog(id: string, data: Partial<{ totalParts: number; rejection: number; partyName: string; jobType: 'outside-rod' | 'outside-pin'; partName: string }>) {
    return this.request<any>(`/transporter-logs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTransporterLog(id: string) {
    return this.request<any>(`/transporter-logs/${id}`, {
      method: 'DELETE',
    });
  }

  async getTransporterStats(filters?: {
    date?: string;
    from?: string;
    to?: string;
    employee?: string;
    partyName?: string;
  }) {
    const query = filters ?
      '?' + Object.entries(filters)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join('&') : '';
    return this.request<{
      totalLogs: number;
      totalParts: number;
      totalRejection: number;
      uniqueEmployeesCount: number;
    }>(`/transporter-logs/stats${query}`);
  }
}

export const apiService = new ApiService();
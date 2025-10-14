const API_BASE_URL = (import.meta as any)?.env?.VITE_API_URL 
  || 'https://forgetrack-backend-wk3o.onrender.com/api';

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
      const user = JSON.parse(userData);
      return user.token || null;
    }
    return null;
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
        throw new Error(data.message || 'Request failed');
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
  async getEmployees() {
    return this.request<any[]>('/users/employees');
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

  async updateProduct(productId: string, data: { sizes: string[] }) {
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
}

export const apiService = new ApiService();
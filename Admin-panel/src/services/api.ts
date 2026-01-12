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
      // attempt to parse JSON body, but handle empty / non-json responses gracefully
      let data: any = {};
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        // non-JSON or empty body
        data = {};
      }

      if (!response.ok) {
        const details = [data?.message, Array.isArray(data?.errors) ? data.errors.join(', ') : '', data?.error]
          .filter(Boolean)
          .join(' | ');
        const msg = details || `Request failed (${response.status} ${response.statusText})`;
        const err = new Error(msg);
        try { (err as any).status = response.status; (err as any).body = data; } catch {}
        throw err;
      }

      // Normalize returned structure: if backend returns { success:true, data:... } return as-is, else wrap
      if (data && typeof data === 'object' && ('success' in data || 'data' in data)) {
        return data as ApiResponse<T>;
      }

      return { success: true, data: data } as ApiResponse<T>;
    } catch (error) {
      // Avoid noisy console.error for expected 404 'Route not found' responses;
      // keep debug-level logging so developer can still inspect if needed.
      if ((error as any)?.status === 404) {
        console.debug('API request 404:', error);
      } else {
        console.error('API request error:', error);
      }
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
    employmentType?: 'Contract' | 'Monthly' | 'Daily Roj';
  }) {
    return this.request<any>('/users/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    });
  }
  
  async viewEmployeePassword(employeeId: string) {
    return this.request<{ employeeId: string; password: string }>(`/users/employees/${employeeId}/password`);
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
      employmentType: 'Contract' | 'Monthly' | 'Daily Roj';
      salaryPerDay: number;
      dailyRojRate: number;
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
    partSize?: string;
    specialSize?: string;
    operation?: string | null;
    totalParts: number;
    rejection?: number;
    employeeId?: string; // admin override
    workDate?: string;   // YYYY-MM-DD, admin override
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
    jobType: 'outside-rod' | 'outside-pin' | 'outside-sleeve';
    partyName: string;
    partName: string;
    totalParts: number;
    rejection?: number;
    weight?: number;
    workDate?: string;   // YYYY-MM-DD
    employeeId?: string; // admin override
  }) {
    return this.request<any>('/transporter-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTransporterLog(id: string, data: Partial<{ totalParts: number; rejection: number; partyName: string; jobType: 'outside-rod' | 'outside-pin' | 'outside-sleeve'; partName: string; weight: number }>) {
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

  // Party endpoints
  async getParties(partyType?: string) {
    const query = partyType ? `?partyType=${partyType}` : '';
    return this.request<any[]>(`/parties${query}`);
  }

  async createParty(data: { partyType: string; partyName: string }) {
    return this.request<any>('/parties', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateParty(id: string, data: Partial<{ partyType: string; partyName: string }>) {
    return this.request<any>(`/parties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteParty(id: string) {
    return this.request<any>(`/parties/${id}`, {
      method: 'DELETE',
    });
  }

  // Job Type endpoints
  async getJobTypes(partType?: string) {
    const query = partType ? `?partType=${partType}` : '';
    return this.request<any[]>(`/job-types${query}`);
  }

  async createJobType(data: { partType: string; jobName: string; rate?: number }) {
    return this.request<any>('/job-types', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateJobType(id: string, data: Partial<{ partType: string; jobName: string; rate: number }>) {
    return this.request<any>(`/job-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addJobTypeHike(id: string, data: { rate: number; effectiveFromYear: number; effectiveFromMonth: number }) {
    return this.request<any>(`/job-types/${id}/hikes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateJobTypeHike(id: string, index: number, data: Partial<{ rate: number; effectiveFromYear: number; effectiveFromMonth: number }>) {
    return this.request<any>(`/job-types/${id}/hikes/${index}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteJobTypeHike(id: string, index: number) {
    return this.request<any>(`/job-types/${id}/hikes/${index}`, {
      method: 'DELETE',
    });
  }

  async deleteJobType(id: string) {
    return this.request<any>(`/job-types/${id}`, {
      method: 'DELETE',
    });
  }

  // Employee Salary endpoints
  async getEmployeeSalary(employeeId: string, month: number, year: number) {
    return this.request<{
      employeeId: string;
      employeeName: string;
      month: number;
      year: number;
      dailyLogs: Array<{
        date: string;
        logs: Array<{
          jobName: string;
          partType: string;
          totalParts: number;
          rejection: number;
          okParts: number;
          rate: number;
          amount: number;
          code: string;
          partName: string;
        }>;
        dayTotal: number;
      }>;
      monthTotal: number;
    }>(`/salary/employee/${employeeId}?month=${month}&year=${year}`);
  }

  // Employee hike endpoints (Monthly / Roj rate history)
  async addEmployeeHike(employeeId: string, data: { type: 'monthly' | 'roj'; rate: number; effectiveFromYear: number; effectiveFromMonth: number }) {
    return this.request<any>(`/users/employees/${employeeId}/hikes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmployeeHike(employeeId: string, index: number, data: { type: 'monthly' | 'roj'; rate?: number; effectiveFromYear?: number; effectiveFromMonth?: number }) {
    return this.request<any>(`/users/employees/${employeeId}/hikes/${index}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteEmployeeHike(employeeId: string, index: number, type: 'monthly' | 'roj') {
    const query = `?type=${type}`;
    return this.request<any>(`/users/employees/${employeeId}/hikes/${index}${query}`, {
      method: 'DELETE',
    });
  }

  // Attendance APIs
  async saveAttendance(data: { employeeId: string; date: string; present: boolean; note?: string }) {
    return this.request<any>('/attendance', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateAttendance(id: string, data: Partial<{ present: boolean; note?: string }>) {
    return this.request<any>(`/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteAttendance(id: string) {
    return this.request<any>(`/attendance/${id}`, { method: 'DELETE' });
  }

  async bulkDeleteAttendance(params: { employeeId: string; month: number; year: number }) {
    const search = new URLSearchParams();
    search.set('employeeId', params.employeeId);
    search.set('month', String(params.month));
    search.set('year', String(params.year));
    return this.request<any>(`/attendance/bulk?${search.toString()}`, { method: 'DELETE' });
  }

  async listAttendance(params: { employeeId?: string; month: number; year: number }) {
    const search = new URLSearchParams();
    if (params.employeeId) search.set('employeeId', params.employeeId);
    search.set('month', String(params.month));
    search.set('year', String(params.year));
    return this.request<any>(`/attendance?${search.toString()}`);
  }

  async attendanceSummary(params: { month: number; year: number }) {
    const search = new URLSearchParams();
    search.set('month', String(params.month));
    search.set('year', String(params.year));
    return this.request<Array<{ _id: string; presentDays: number }>>(`/attendance/summary?${search.toString()}`);
  }

  // Upad APIs
  async createUpad(data: { employeeId: string; month: number; year: number; amount: number; note?: string }) {
    return this.request<any>('/finance/upad', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listUpad(params: { employeeId?: string; month?: number; year?: number }) {
    const search = new URLSearchParams();
    if (params.employeeId) search.set('employeeId', params.employeeId);
    if (typeof params.month === 'number') search.set('month', String(params.month));
    if (typeof params.year === 'number') search.set('year', String(params.year));
    const qs = search.toString();
    return this.request<any>(`/finance/upad${qs ? `?${qs}` : ''}`);
  }

  async updateUpad(id: string, data: Partial<{ month: number; year: number; amount: number; note?: string }>) {
    return this.request<any>(`/finance/upad/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUpad(id: string) {
    return this.request<any>(`/finance/upad/${id}`, {
      method: 'DELETE',
    });
  }

  // Loan APIs
  async createLoan(data: { employeeId: string; startMonth: number; startYear: number; principal: number; defaultInstallment: number; note?: string }) {
    return this.request<any>('/finance/loans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listLoans(params: { employeeId?: string; status?: string }) {
    const search = new URLSearchParams();
    if (params.employeeId) search.set('employeeId', params.employeeId);
    if (params.status) search.set('status', params.status);
    const qs = search.toString();
    return this.request<any>(`/finance/loans${qs ? `?${qs}` : ''}`);
  }

  async updateLoan(id: string, data: Partial<{ principal: number; defaultInstallment: number; note?: string; status?: string }>) {
    return this.request<any>(`/finance/loans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLoan(id: string) {
    return this.request<any>(`/finance/loans/${id}`, {
      method: 'DELETE',
    });
  }

  async createLoanTransaction(loanId: string, data: { month: number; year: number; amount: number; mode?: string }) {
    return this.request<any>(`/finance/loans/${loanId}/transactions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listLoanTransactions(loanId: string) {
    return this.request<any[]>(`/finance/loans/${loanId}/transactions`);
  }

  async updateLoanTransaction(transactionId: string, data: Partial<{ month: number; year: number; amount: number; mode: string }>) {
    return this.request<any>(`/finance/loans/transactions/${transactionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLoanTransaction(transactionId: string) {
    return this.request<any>(`/finance/loans/transactions/${transactionId}`, {
      method: 'DELETE',
    });
  }

  async getEmployeeLoanData(employeeId: string) {
    return this.request<{ loans: any[]; transactions: any[]; stats: Record<string, { paidTotal: number; pendingAmount: number }> }>(
      `/finance/loans/${employeeId}/data`
    );
  }

  async getLoanSummary(employeeId: string, month: number, year: number) {
    return this.request<{ pendingTotal: number; installmentForMonth: number }>(
      `/finance/loans/${employeeId}/summary?month=${month}&year=${year}`
    );
  }

  // Overtime APIs
  async listOvertime(params: { employeeId: string; month: number; year: number }) {
    const search = new URLSearchParams();
    search.set('employeeId', params.employeeId);
    search.set('month', String(params.month));
    search.set('year', String(params.year));
    return this.request<Array<{ _id: string; employeeId: string; date: string; hours: number; rate?: number }>>(
      `/attendance/overtime?${search.toString()}`
    );
  }

  async createOvertime(data: { employeeId: string; date: string; hours: number; rate?: number }) {
    return this.request<any>(`/attendance/overtime`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOvertime(id: string, data: Partial<{ date: string; hours: number; rate: number }>) {
    return this.request<any>(`/attendance/overtime/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteOvertime(id: string) {
    return this.request<any>(`/attendance/overtime/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkDeleteOvertime(params: { employeeId: string; month: number; year: number }) {
    const search = new URLSearchParams();
    search.set('employeeId', params.employeeId);
    search.set('month', String(params.month));
    search.set('year', String(params.year));
    return this.request<any>(`/attendance/overtime/bulk?${search.toString()}`, { method: 'DELETE' });
  }
}

export const apiService = new ApiService();
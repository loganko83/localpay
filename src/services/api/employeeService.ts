/**
 * Employee Service
 * Frontend integration for merchant employee management
 */

import { backendApiClient } from './client';

// ==================== Types ====================

export interface Employee {
  id: string;
  merchantId: string;
  userId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'owner' | 'manager' | 'cashier';
  permissions: string[];
  status: 'active' | 'pending' | 'revoked';
  lastActiveAt: string | null;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeListResponse {
  employees: Employee[];
  counts: {
    active: number;
    pending: number;
    revoked: number;
    total: number;
  };
}

export interface EmployeeFilters {
  status?: 'active' | 'pending' | 'revoked';
  role?: 'owner' | 'manager' | 'cashier';
  search?: string;
}

export interface CreateEmployeeRequest {
  name: string;
  email?: string;
  phone?: string;
  role: 'manager' | 'cashier';
  permissions?: string[];
}

export interface UpdateEmployeeRequest {
  name?: string;
  email?: string;
  phone?: string;
  role?: 'manager' | 'cashier';
}

export interface InviteEmployeeRequest {
  name: string;
  email: string;
  role: 'manager' | 'cashier';
  permissions?: string[];
  message?: string;
}

export interface EmployeeActivity {
  id: string;
  timestamp: string;
  action: string;
  description: string;
  metadata: Record<string, unknown> | null;
}

export interface EmployeeActivityResponse {
  employee: {
    id: string;
    name: string;
    lastActiveAt: string | null;
  };
  activities: EmployeeActivity[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface EmployeePermissionsResponse {
  employeeId: string;
  employeeName: string;
  role: string;
  permissions: string[];
  availablePermissions: string[];
}

// ==================== Employee Service ====================

class EmployeeService {
  /**
   * Get all employees for the merchant
   */
  async getEmployees(filters?: EmployeeFilters): Promise<EmployeeListResponse> {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.role) params.append('role', filters.role);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const endpoint = queryString ? `/employees?${queryString}` : '/employees';

    const response = await backendApiClient.get<{ success: boolean; data: EmployeeListResponse }>(endpoint);
    return response.data;
  }

  /**
   * Get single employee
   */
  async getEmployee(employeeId: string): Promise<Employee> {
    const response = await backendApiClient.get<{ success: boolean; data: Employee }>(`/employees/${employeeId}`);
    return response.data;
  }

  /**
   * Add a new employee
   */
  async addEmployee(data: CreateEmployeeRequest): Promise<Employee> {
    const response = await backendApiClient.post<{ success: boolean; data: Employee }>('/employees', data);
    return response.data;
  }

  /**
   * Update employee
   */
  async updateEmployee(employeeId: string, data: UpdateEmployeeRequest): Promise<Employee> {
    const response = await backendApiClient.put<{ success: boolean; data: Employee }>(`/employees/${employeeId}`, data);
    return response.data;
  }

  /**
   * Delete employee
   */
  async deleteEmployee(employeeId: string): Promise<void> {
    await backendApiClient.delete<{ success: boolean }>(`/employees/${employeeId}`);
  }

  /**
   * Get employee permissions
   */
  async getPermissions(employeeId: string): Promise<EmployeePermissionsResponse> {
    const response = await backendApiClient.get<{ success: boolean; data: EmployeePermissionsResponse }>(`/employees/${employeeId}/permissions`);
    return response.data;
  }

  /**
   * Update employee permissions
   */
  async updatePermissions(employeeId: string, permissions: string[]): Promise<{ employeeId: string; permissions: string[] }> {
    const response = await backendApiClient.put<{ success: boolean; data: { employeeId: string; permissions: string[] } }>(
      `/employees/${employeeId}/permissions`,
      { permissions }
    );
    return response.data;
  }

  /**
   * Get employee activity
   */
  async getActivity(employeeId: string, page: number = 0, size: number = 20): Promise<EmployeeActivityResponse> {
    const response = await backendApiClient.get<{ success: boolean; data: EmployeeActivityResponse }>(
      `/employees/${employeeId}/activity?page=${page}&size=${size}`
    );
    return response.data;
  }

  /**
   * Send invite to new employee
   */
  async inviteEmployee(data: InviteEmployeeRequest): Promise<{ employeeId: string; email: string; status: string; inviteSent: boolean }> {
    const response = await backendApiClient.post<{ success: boolean; data: { employeeId: string; email: string; status: string; inviteSent: boolean } }>(
      '/employees/invite',
      data
    );
    return response.data;
  }

  /**
   * Resend invite to pending employee
   */
  async resendInvite(employeeId: string): Promise<{ employeeId: string; email: string; inviteSent: boolean }> {
    const response = await backendApiClient.post<{ success: boolean; data: { employeeId: string; email: string; inviteSent: boolean } }>(
      `/employees/${employeeId}/resend-invite`,
      {}
    );
    return response.data;
  }

  /**
   * Revoke employee access
   */
  async revokeAccess(employeeId: string, reason?: string): Promise<{ employeeId: string; status: string }> {
    const response = await backendApiClient.post<{ success: boolean; data: { employeeId: string; status: string } }>(
      `/employees/${employeeId}/revoke`,
      { reason }
    );
    return response.data;
  }

  /**
   * Activate employee
   */
  async activateEmployee(employeeId: string): Promise<{ employeeId: string; status: string }> {
    const response = await backendApiClient.post<{ success: boolean; data: { employeeId: string; status: string } }>(
      `/employees/${employeeId}/activate`,
      {}
    );
    return response.data;
  }
}

// Export singleton instance
export const employeeService = new EmployeeService();

export default employeeService;

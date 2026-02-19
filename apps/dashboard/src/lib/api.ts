/**
 * API client for WhatsApp Bot backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ApiError {
  error: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;

    // Try to load token from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  getToken() {
    return this.token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({
        error: `HTTP ${response.status}`,
      }));
      // API returns { success: false, error: { code, message } } or { error: "string" }
      const errObj = body.error;
      const message =
        typeof errObj === 'string'
          ? errObj
          : errObj?.message || body.message || `Request failed: ${response.status}`;
      throw new Error(message);
    }

    const json = await response.json();
    // API wraps responses in { success: true, data: {...} }
    return json.data || json;
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async register(tenantName: string, email: string, password: string, name: string) {
    const data = await this.request<{ token: string; user: any; tenant: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ tenantName, email, password, name }),
    });
    this.setToken(data.token);
    return data;
  }

  async getMe() {
    return this.request<{ user: any }>('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Inbox
  async getInboxConversations(params?: {
    status?: string;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<any>(`/inbox${query ? `?${query}` : ''}`);
  }

  async getInboxStats(userId?: string) {
    const query = userId ? `?userId=${userId}` : '';
    return this.request<any>(`/inbox/stats${query}`);
  }

  async getConversation(conversationId: string) {
    return this.request<any>(`/inbox/${conversationId}`);
  }

  async assignConversation(conversationId: string, assignedToUserId: string | null) {
    return this.request<any>(`/inbox/${conversationId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assignedToUserId }),
    });
  }

  async sendAgentReply(conversationId: string, message: string) {
    return this.request<any>(`/inbox/${conversationId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async closeConversation(conversationId: string, resolution?: string) {
    return this.request<any>(`/inbox/${conversationId}/close`, {
      method: 'POST',
      body: JSON.stringify({ resolution }),
    });
  }

  // Cases
  async getCases(params?: {
    status?: string;
    assignedTo?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<any>(`/cases${query ? `?${query}` : ''}`);
  }

  async getCase(caseId: string) {
    return this.request<any>(`/cases/${caseId}`);
  }

  async updateCase(caseId: string, data: any) {
    return this.request<any>(`/cases/${caseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Analytics
  async getOverviewAnalytics(dateRange?: { startDate: string; endDate: string }) {
    const query = dateRange
      ? `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      : '';
    return this.request<any>(`/analytics/overview${query}`);
  }

  async getIntentAnalytics(dateRange?: { startDate: string; endDate: string }) {
    const query = dateRange
      ? `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      : '';
    return this.request<any>(`/analytics/intents${query}`);
  }

  async getAgentAnalytics(dateRange?: { startDate: string; endDate: string }) {
    const query = dateRange
      ? `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      : '';
    return this.request<any>(`/analytics/agents${query}`);
  }

  async getSLAMetrics(dateRange?: { startDate: string; endDate: string }) {
    const query = dateRange
      ? `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      : '';
    return this.request<any>(`/analytics/sla${query}`);
  }

  // Products
  async getProducts(params?: { query?: string; category?: string; inStock?: boolean; limit?: number; offset?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<any>(`/products${query ? `?${query}` : ''}`);
  }

  async getProductCategories() {
    return this.request<string[]>('/products/categories');
  }

  async searchProducts(query: string, category?: string) {
    const params = new URLSearchParams({ query });
    if (category) params.append('category', category);
    return this.request<any>(`/products/search?${params.toString()}`);
  }

  async getProduct(id: string) {
    return this.request<any>(`/products/${id}`);
  }

  async createProduct(data: any) {
    return this.request<any>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: any) {
    return this.request<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string) {
    return this.request<any>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  async importProductsCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    // Remove Content-Type header to let browser set it with boundary
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}/products/import`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(error.error || error.message || `Request failed: ${response.status}`);
    }

    const json = await response.json();
    return json.data || json;
  }

  // WhatsApp Configuration
  async connectWhatsApp(data: any) {
    return this.request<any>('/tenant/whatsapp/connect', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getWhatsAppStatus() {
    return this.request<any>('/tenant/whatsapp/status');
  }

  async updateWhatsAppCatalog(catalogId: string) {
    return this.request<any>('/tenant/whatsapp/catalog', {
      method: 'PUT',
      body: JSON.stringify({ catalogId }),
    });
  }

  // Policies
  async getPolicies() {
    return this.request<any>('/tenant/policies');
  }

  async updatePolicies(data: any) {
    return this.request<any>('/tenant/policies', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Templates
  async getTemplates() {
    return this.request<any>('/tenant/templates');
  }

  async createTemplate(data: any) {
    return this.request<any>('/tenant/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTemplate(id: string, data: any) {
    return this.request<any>(`/tenant/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTemplate(id: string) {
    return this.request<any>(`/tenant/templates/${id}`, {
      method: 'DELETE',
    });
  }

  // Team
  async getTeamMembers() {
    return this.request<any>('/team');
  }

  async createTeamMember(data: { email: string; password: string; name: string; role: string }) {
    return this.request<any>('/team', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeamMember(userId: string, data: { name?: string; role?: string; isActive?: boolean }) {
    return this.request<any>(`/team/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);

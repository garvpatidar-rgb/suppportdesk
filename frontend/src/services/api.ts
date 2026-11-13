import type { AuthResponse, Comment, Ticket, TicketHistory, User } from '../types';

const API_BASE = 'http://localhost:9090/api/v1';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  // Auth
  async register(name: string, email: string, password: string, role = 'customer', skills = 'Technical'): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, skills }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to register');
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to login');
    return data;
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch user');
    return data;
  },

  // Tickets
  async listTickets(): Promise<Ticket[]> {
    const res = await fetch(`${API_BASE}/tickets`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch tickets');
    return data;
  },

  async createTicket(ticket: { subject: string; description: string; category: string; priority: string }): Promise<Ticket> {
    const res = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(ticket),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create ticket');
    return data;
  },

  async updateTicketStatus(id: number, status: 'open' | 'in_progress' | 'resolved'): Promise<Ticket> {
    const res = await fetch(`${API_BASE}/tickets/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update status');
    return data;
  },

  // Comments & Conversations
  async listComments(ticketId: number): Promise<Comment[]> {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/comments`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch comments');
    return data;
  },

  async addComment(ticketId: number, body: string, isInternal = false): Promise<Comment> {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/comments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ body, is_internal: isInternal }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to post message');
    return data;
  },

  // Audit Trail History
  async getTicketHistory(ticketId: number): Promise<TicketHistory[]> {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/history`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch audit history');
    return data;
  },
};

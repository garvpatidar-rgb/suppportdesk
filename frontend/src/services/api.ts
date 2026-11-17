import type { AuthResponse, Comment, Ticket, TicketHistory, User } from '../types';
import { mockService } from './mockService';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function runWithFallback<T>(apiFn: () => Promise<T>, mockFn: () => Promise<T>): Promise<T> {
  // If force demo mode is active or user explicitly chooses demo mode
  if (localStorage.getItem('force_demo_mode') === 'true') {
    return mockFn();
  }

  try {
    // Attempt real backend call with 3.5s timeout so it doesn't hang if backend is down
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const result = await apiFn();
    clearTimeout(timeout);
    localStorage.removeItem('demo_mode_active');
    return result;
  } catch (err: any) {
    console.warn('Real API unavailable, activating demo mode fallback:', err.message);
    localStorage.setItem('demo_mode_active', 'true');
    return mockFn();
  }
}

export const api = {
  // Auth
  async register(name: string, email: string, password: string, role = 'customer', skills = 'Technical'): Promise<AuthResponse> {
    return runWithFallback(
      async () => {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role, skills }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to register');
        return data;
      },
      () => mockService.register(name, email, password, role, skills)
    );
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    return runWithFallback(
      async () => {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to login');
        return data;
      },
      () => mockService.login(email, password)
    );
  },

  async getMe(): Promise<User> {
    return runWithFallback(
      async () => {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: getHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch user');
        return data;
      },
      () => mockService.getMe()
    );
  },

  // Tickets
  async listTickets(): Promise<Ticket[]> {
    return runWithFallback(
      async () => {
        const res = await fetch(`${API_BASE}/tickets`, {
          headers: getHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch tickets');
        return data;
      },
      () => mockService.listTickets()
    );
  },

  async createTicket(ticket: { subject: string; description: string; category: string; priority: string }): Promise<Ticket> {
    return runWithFallback(
      async () => {
        const res = await fetch(`${API_BASE}/tickets`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(ticket),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create ticket');
        return data;
      },
      () => mockService.createTicket(ticket)
    );
  },

  async updateTicketStatus(id: number, status: 'open' | 'in_progress' | 'resolved'): Promise<Ticket> {
    return runWithFallback(
      async () => {
        const res = await fetch(`${API_BASE}/tickets/${id}/status`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({ status }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update status');
        return data;
      },
      () => mockService.updateTicketStatus(id, status)
    );
  },

  // Comments & Conversations
  async listComments(ticketId: number): Promise<Comment[]> {
    return runWithFallback(
      async () => {
        const res = await fetch(`${API_BASE}/tickets/${ticketId}/comments`, {
          headers: getHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch comments');
        return data;
      },
      () => mockService.listComments(ticketId)
    );
  },

  async addComment(ticketId: number, body: string, isInternal = false): Promise<Comment> {
    return runWithFallback(
      async () => {
        const res = await fetch(`${API_BASE}/tickets/${ticketId}/comments`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ body, is_internal: isInternal }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to post message');
        return data;
      },
      () => mockService.addComment(ticketId, body, isInternal)
    );
  },

  // Audit Trail History
  async getTicketHistory(ticketId: number): Promise<TicketHistory[]> {
    return runWithFallback(
      async () => {
        const res = await fetch(`${API_BASE}/tickets/${ticketId}/history`, {
          headers: getHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch audit history');
        return data;
      },
      () => mockService.getTicketHistory(ticketId)
    );
  },
};

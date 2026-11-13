export interface User {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'agent' | 'admin';
  skills?: string;
  max_capacity?: number;
  is_available?: boolean;
  created_at: string;
}

export interface Comment {
  id: number;
  ticket_id: number;
  author_id: number;
  author?: User;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export interface TicketHistory {
  id: number;
  ticket_id: number;
  user_id: number;
  user?: User;
  action: string;
  details: string;
  created_at: string;
}

export interface Ticket {
  id: number;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: 'open' | 'in_progress' | 'resolved';
  customer_id: number;
  customer?: User;
  agent_id?: number;
  agent?: User;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

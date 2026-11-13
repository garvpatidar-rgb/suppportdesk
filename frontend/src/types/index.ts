export interface User {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'agent' | 'admin';
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

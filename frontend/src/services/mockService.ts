import type { AuthResponse, Comment, Ticket, TicketHistory, User } from '../types';

interface MockDB {
  users: User[];
  tickets: Ticket[];
  comments: Comment[];
  history: TicketHistory[];
}

const STORAGE_KEY = 'supportdesk_mock_db';
const TOKEN_KEY = 'token';
const CURRENT_USER_KEY = 'supportdesk_mock_current_user';

function getInitialDB(): MockDB {
  const users: User[] = [
    {
      id: 1,
      name: 'Rahul Sharma',
      email: 'customer@demo.com',
      role: 'customer',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 2,
      name: 'Priya Patel',
      email: 'agent.priya@demo.com',
      role: 'agent',
      skills: 'Payment,Technical',
      max_capacity: 5,
      is_available: true,
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
      id: 3,
      name: 'Amit Verma',
      email: 'agent.amit@demo.com',
      role: 'agent',
      skills: 'Delivery,Account',
      max_capacity: 5,
      is_available: true,
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
      id: 4,
      name: 'Operations Admin',
      email: 'admin@demo.com',
      role: 'admin',
      created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    },
  ];

  const tickets: Ticket[] = [
    {
      id: 101,
      subject: 'Double deduction during UPI payment',
      description: 'Rs. 1,499 was debited twice for Order #OD98214 via Google Pay. Bank confirms both debits went through.',
      category: 'Payment',
      priority: 'high',
      status: 'in_progress',
      customer_id: 1,
      customer: users[0],
      agent_id: 2,
      agent: users[1],
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 102,
      subject: 'Shipment tracking stuck on In Transit',
      description: 'Package tracking has shown no movement between Delhi and Mumbai hub for 4 consecutive days.',
      category: 'Delivery',
      priority: 'normal',
      status: 'open',
      customer_id: 1,
      customer: users[0],
      agent_id: 3,
      agent: users[2],
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 103,
      subject: 'OAuth login 500 error on Chrome',
      description: 'Getting internal server error when trying to authenticate with Google on Chrome v122.',
      category: 'Technical',
      priority: 'urgent',
      status: 'resolved',
      customer_id: 1,
      customer: users[0],
      agent_id: 2,
      agent: users[1],
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  const comments: Comment[] = [
    {
      id: 1,
      ticket_id: 101,
      author_id: 1,
      author: users[0],
      body: 'Here is the UTR reference number from my bank: UPI/4028491829.',
      is_internal: false,
      created_at: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    },
    {
      id: 2,
      ticket_id: 101,
      author_id: 2,
      author: users[1],
      body: 'Verified with Razorpay gateway. Duplicate charge identified; automated refund #RF78129 triggered.',
      is_internal: true,
      created_at: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    },
    {
      id: 3,
      ticket_id: 101,
      author_id: 2,
      author: users[1],
      body: 'Hi Rahul, we confirmed the duplicate charge and your refund has been processed. It should reflect in 2-3 business days.',
      is_internal: false,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ];

  const history: TicketHistory[] = [
    {
      id: 1,
      ticket_id: 101,
      user_id: 1,
      user: users[0],
      action: 'created',
      details: 'Ticket created and automatically assigned to agent Priya Patel based on skill [Payment].',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 2,
      ticket_id: 101,
      user_id: 2,
      user: users[1],
      action: 'status_change',
      details: 'Status updated from [open] to [in_progress]',
      created_at: new Date(Date.now() - 3600000 * 2.8).toISOString(),
    },
    {
      id: 3,
      ticket_id: 102,
      user_id: 1,
      user: users[0],
      action: 'created',
      details: 'Ticket created and automatically assigned to agent Amit Verma based on skill [Delivery].',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 4,
      ticket_id: 103,
      user_id: 1,
      user: users[0],
      action: 'created',
      details: 'Ticket created and automatically assigned to agent Priya Patel based on skill [Technical].',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 5,
      ticket_id: 103,
      user_id: 2,
      user: users[1],
      action: 'status_change',
      details: 'Status updated from [in_progress] to [resolved]',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  return { users, tickets, comments, history };
}

function loadDB(): MockDB {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = getInitialDB();
    saveDB(initial);
    return initial;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const initial = getInitialDB();
    saveDB(initial);
    return initial;
  }
}

function saveDB(db: MockDB) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export const mockService = {
  isMockActive(): boolean {
    return true;
  },

  async login(email: string, _password?: string): Promise<AuthResponse> {
    const db = loadDB();
    let user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      // Auto-create user for demo convenience if email doesn't exist
      const role = email.includes('admin') ? 'admin' : (email.includes('agent') ? 'agent' : 'customer');
      user = {
        id: Date.now(),
        name: email.split('@')[0].replace(/[._]/g, ' '),
        email,
        role: role as any,
        skills: 'Payment,Technical',
        max_capacity: 5,
        is_available: true,
        created_at: new Date().toISOString(),
      };
      db.users.push(user);
      saveDB(db);
    }
    const token = `mock-jwt-token-${user.id}-${Date.now()}`;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return { token, user };
  },

  async register(name: string, email: string, _password: string, role = 'customer', skills = 'Technical'): Promise<AuthResponse> {
    const db = loadDB();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return this.login(email);
    }

    const newUser: User = {
      id: Date.now(),
      name,
      email,
      role: role as any,
      skills,
      max_capacity: 5,
      is_available: true,
      created_at: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveDB(db);

    const token = `mock-jwt-token-${newUser.id}-${Date.now()}`;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    return { token, user: newUser };
  },

  async getMe(): Promise<User> {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) throw new Error('Not authenticated');
    return JSON.parse(raw);
  },

  async listTickets(): Promise<Ticket[]> {
    const db = loadDB();
    const currentUser = await this.getMe().catch(() => null);
    if (!currentUser) return [];

    let list = [...db.tickets];
    if (currentUser.role === 'customer') {
      list = list.filter(t => t.customer_id === currentUser.id);
    }
    return list.sort((a, b) => b.id - a.id);
  },

  async createTicket(ticketInput: { subject: string; description: string; category: string; priority: string }): Promise<Ticket> {
    const db = loadDB();
    const currentUser = await this.getMe();

    // Auto-assignment algorithm (matching Go backend logic)
    const availableAgents = db.users.filter(u => u.role === 'agent' && (u.is_available ?? true));
    let bestAgent: User | undefined;
    let minLoad = 999999;

    for (const agent of availableAgents) {
      const agentSkills = (agent.skills || '').split(',').map(s => s.trim().toLowerCase());
      const hasSkill = agentSkills.includes(ticketInput.category.toLowerCase());

      const activeCount = db.tickets.filter(
        t => t.agent_id === agent.id && (t.status === 'open' || t.status === 'in_progress')
      ).length;

      if (activeCount >= (agent.max_capacity || 5)) continue;

      if (hasSkill) {
        if (activeCount < minLoad) {
          minLoad = activeCount;
          bestAgent = agent;
        }
      } else if (!bestAgent) {
        if (activeCount < minLoad) {
          minLoad = activeCount;
          bestAgent = agent;
        }
      }
    }

    const newTicket: Ticket = {
      id: Math.floor(100 + Math.random() * 900),
      subject: ticketInput.subject,
      description: ticketInput.description,
      category: ticketInput.category,
      priority: ticketInput.priority || 'normal',
      status: 'open',
      customer_id: currentUser.id,
      customer: currentUser,
      agent_id: bestAgent?.id,
      agent: bestAgent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.tickets.unshift(newTicket);

    const historyDetail = bestAgent
      ? `Ticket created and automatically assigned to agent ${bestAgent.name} based on skill [${newTicket.category}].`
      : 'Ticket created (currently unassigned - awaiting available agent).';

    db.history.unshift({
      id: Date.now(),
      ticket_id: newTicket.id,
      user_id: currentUser.id,
      user: currentUser,
      action: 'created',
      details: historyDetail,
      created_at: new Date().toISOString(),
    });

    saveDB(db);
    return newTicket;
  },

  async updateTicketStatus(id: number, status: 'open' | 'in_progress' | 'resolved'): Promise<Ticket> {
    const db = loadDB();
    const currentUser = await this.getMe();
    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) throw new Error('Ticket not found');

    const oldStatus = ticket.status;
    ticket.status = status;
    ticket.updated_at = new Date().toISOString();

    db.history.unshift({
      id: Date.now(),
      ticket_id: ticket.id,
      user_id: currentUser.id,
      user: currentUser,
      action: 'status_change',
      details: `Status updated from [${oldStatus}] to [${status}]`,
      created_at: new Date().toISOString(),
    });

    saveDB(db);
    return ticket;
  },

  async listComments(ticketId: number): Promise<Comment[]> {
    const db = loadDB();
    const currentUser = await this.getMe().catch(() => null);
    let comments = db.comments.filter(c => c.ticket_id === ticketId);

    // Filter out internal notes for customers
    if (currentUser?.role === 'customer') {
      comments = comments.filter(c => !c.is_internal);
    }
    return comments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },

  async addComment(ticketId: number, body: string, isInternal = false): Promise<Comment> {
    const db = loadDB();
    const currentUser = await this.getMe();

    const newComment: Comment = {
      id: Date.now(),
      ticket_id: ticketId,
      author_id: currentUser.id,
      author: currentUser,
      body,
      is_internal: currentUser.role === 'customer' ? false : isInternal,
      created_at: new Date().toISOString(),
    };

    db.comments.push(newComment);
    saveDB(db);
    return newComment;
  },

  async getTicketHistory(ticketId: number): Promise<TicketHistory[]> {
    const db = loadDB();
    return db.history
      .filter(h => h.ticket_id === ticketId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
};

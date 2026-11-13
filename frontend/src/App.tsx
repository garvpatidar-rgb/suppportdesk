import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import type { User, Ticket } from './types';
import { LifeBuoy, LogOut, Plus, RefreshCw, CheckCircle, Clock } from 'lucide-react';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auth Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'agent' | 'admin'>('customer');

  // Tickets State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technical');
  const [priority, setPriority] = useState('normal');

  // Check login on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.getMe()
        .then(setUser)
        .catch(() => localStorage.removeItem('token'));
    }
  }, []);

  // Fetch tickets when user changes
  useEffect(() => {
    if (user) {
      loadTickets();
    }
  }, [user]);

  async function loadTickets() {
    try {
      setLoading(true);
      const data = await api.listTickets();
      setTickets(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let res;
      if (isLoginMode) {
        res = await api.login(email, password);
      } else {
        res = await api.register(name, email, password, role);
      }
      localStorage.setItem('token', res.token);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    setUser(null);
    setTickets([]);
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      await api.createTicket({ subject, description, category, priority });
      setSubject('');
      setDescription('');
      setShowCreateModal(false);
      loadTickets();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(ticketId: number, status: 'open' | 'in_progress' | 'resolved') {
    try {
      await api.updateTicketStatus(ticketId, status);
      loadTickets();
    } catch (err: any) {
      alert(err.message);
    }
  }

  // 1. Authentication View
  if (!user) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <LifeBuoy size={40} color="var(--primary)" style={{ margin: '0 auto 8px' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>SupportDesk</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {isLoginMode ? 'Sign in to access your support portal' : 'Create an account to start'}
            </p>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleAuth}>
            {!isLoginMode && (
              <>
                <div className="form-group">
                  <label>Full Name</label>
                  <input className="form-control" type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select className="form-control" value={role} onChange={e => setRole(e.target.value as any)}>
                    <option value="customer">Customer</option>
                    <option value="agent">Support Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <input className="form-control" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input className="form-control" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={6} />
            </div>

            <button className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
              {loading ? 'Please wait...' : (isLoginMode ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.9rem' }}>
            {isLoginMode ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
            >
              {isLoginMode ? 'Register' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Main Dashboard View
  return (
    <div>
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">
          <LifeBuoy size={24} />
          SupportDesk
        </div>
        <div className="user-info">
          <span>{user.name}</span>
          <span className="badge-role">{user.role}</span>
          <button className="btn btn-outline" style={{ padding: '6px 12px' }} onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {user.role === 'customer' ? 'My Support Tickets' : 'Assigned Support Tickets'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {user.role === 'customer' ? 'Track your active requests and issues' : 'Manage and resolve customer tickets'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-outline" onClick={loadTickets}>
              <RefreshCw size={16} /> Refresh
            </button>
            {user.role === 'customer' && (
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                <Plus size={16} /> Create Ticket
              </button>
            )}
          </div>
        </div>

        {/* Create Ticket Modal */}
        {showCreateModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '1.25rem', fontWeight: 600 }}>Create New Support Ticket</h3>
              <form onSubmit={handleCreateTicket}>
                <div className="form-group">
                  <label>Subject</label>
                  <input className="form-control" required value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Payment deducted twice" />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select className="form-control" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="Payment">Payment</option>
                    <option value="Technical">Technical</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Account">Account</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select className="form-control" value={priority} onChange={e => setPriority(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="form-control" rows={4} required value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide detailed details..." />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>Submit Ticket</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tickets List */}
        {loading && tickets.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '48px' }}>Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 16px' }}>
            <LifeBuoy size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ color: 'var(--text-muted)' }}>No tickets found</h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
              {user.role === 'customer' ? 'Click "Create Ticket" to submit your first issue.' : 'No active tickets currently available.'}
            </p>
          </div>
        ) : (
          <div className="tickets-list">
            {tickets.map(ticket => (
              <div key={ticket.id} className="ticket-item">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span className={`badge badge-${ticket.status}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span className="badge-priority">
                      {ticket.priority} priority
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      #{ticket.id} • {ticket.category}
                    </span>
                  </div>
                  <h4 className="ticket-title">{ticket.subject}</h4>
                  <p className="ticket-desc">{ticket.description}</p>
                  <div className="ticket-meta">
                    <Clock size={14} /> Created: {new Date(ticket.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Status action for Agents & Admins */}
                {user.role !== 'customer' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: '16px' }}>
                    {ticket.status === 'open' && (
                      <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={() => handleStatusChange(ticket.id, 'in_progress')}>
                        Mark In Progress
                      </button>
                    )}
                    {ticket.status !== 'resolved' && (
                      <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={() => handleStatusChange(ticket.id, 'resolved')}>
                        <CheckCircle size={14} /> Resolve
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

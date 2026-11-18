import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { 
  LifeBuoy, LogOut, Plus, RefreshCw, CheckCircle, 
  Send, Lock, UserCheck, History, MessageSquare, ChevronRight, AlertCircle, ShieldAlert
} from 'lucide-react';

export function App() {
  const [user, setUser] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auth Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [skills, setSkills] = useState('Payment,Technical');

  // Tickets State
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create Form State
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Payment');
  const [priority, setPriority] = useState('normal');

  // Drawer / Conversation State
  const [activeTab, setActiveTab] = useState('conversation');
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.getMe()
        .then(setUser)
        .catch(() => localStorage.removeItem('token'));
    }
  }, []);

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
      if (selectedTicket) {
        const updated = data.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function openTicketDetail(ticket) {
    setSelectedTicket(ticket);
    try {
      const [cmtData, histData] = await Promise.all([
        api.listComments(ticket.id),
        api.getTicketHistory(ticket.id),
      ]);
      setComments(cmtData);
      setHistory(histData);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleAuth(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let res;
      if (isLoginMode) {
        res = await api.login(email, password);
      } else {
        res = await api.register(name, email, password, role, skills);
      }
      localStorage.setItem('token', res.token);
      setUser(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    setUser(null);
    setTickets([]);
    setSelectedTicket(null);
  }

  async function handleCreateTicket(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const created = await api.createTicket({ subject, description, category, priority });
      setSubject('');
      setDescription('');
      setShowCreateModal(false);
      await loadTickets();
      openTicketDetail(created);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(ticketId, status) {
    try {
      await api.updateTicketStatus(ticketId, status);
      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        const histData = await api.getTicketHistory(ticketId);
        setHistory(histData);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  async function handlePostComment(e) {
    e.preventDefault();
    if (!selectedTicket || !newComment.trim()) return;
    try {
      const posted = await api.addComment(selectedTicket.id, newComment, isInternalNote);
      setComments(prev => [...prev, posted]);
      setNewComment('');
      setIsInternalNote(false);
    } catch (err) {
      alert(err.message);
    }
  }

  // 1. Auth Page
  if (!user) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div className="card" style={{ width: '100%', maxWidth: '440px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '56px', height: '56px', background: '#e0e7ff', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <LifeBuoy size={32} color="var(--primary)" />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>SupportDesk</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Enterprise customer support & auto-assignment platform
            </p>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleAuth}>
            {!isLoginMode && (
              <>
                <div className="form-group">
                  <label>Full Name</label>
                  <input className="form-control" type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Sharma" />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select className="form-control" value={role} onChange={e => setRole(e.target.value)}>
                    <option value="customer">Customer (Requests support)</option>
                    <option value="agent">Support Agent (Auto-assigned tickets)</option>
                    <option value="admin">Admin (Full oversight)</option>
                  </select>
                </div>
                {role === 'agent' && (
                  <div className="form-group">
                    <label>Agent Domain Skills (comma-separated)</label>
                    <input className="form-control" type="text" value={skills} onChange={e => setSkills(e.target.value)} placeholder="Payment,Technical,Delivery" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auto-assign algorithm prioritizes these categories.</span>
                  </div>
                )}
              </>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <input className="form-control" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="user@company.com" />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input className="form-control" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={6} />
            </div>

            <button className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
              {loading ? 'Please wait...' : (isLoginMode ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '0.9rem' }}>
            {isLoginMode ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
            >
              {isLoginMode ? 'Register now' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Main Dashboard Page
  return (
    <div>
      {/* Top Navigation */}
      <nav className="navbar">
        <div className="logo">
          <LifeBuoy size={26} />
          SupportDesk
        </div>
        <div className="user-info">
          <div>
            <strong>{user.name}</strong>
            <span style={{ marginLeft: '8px' }} className="badge-role">{user.role}</span>
          </div>
          <button className="btn btn-outline" style={{ padding: '6px 12px' }} onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="container">
        {/* Banner with Architecture Highlights */}
        <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', color: 'white', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Intelligent Concurrency-Safe Support Desk</h3>
            <p style={{ opacity: 0.9, fontSize: '0.85rem', marginTop: '4px' }}>
              Row-level DB Locking • Dynamic Skill Match & Workload Auto-Assignment • Tamper-proof Audit Trails
            </p>
          </div>
          {user.role === 'customer' && (
            <button className="btn" style={{ background: 'white', color: '#3730a3' }} onClick={() => setShowCreateModal(true)}>
              <Plus size={16} /> New Support Ticket
            </button>
          )}
        </div>

        {/* Layout: Left Tickets Grid + Right Detail / Timeline Drawer */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedTicket ? '1fr 1.1fr' : '1fr', gap: '24px' }}>
          
          {/* Tickets Column */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {user.role === 'customer' ? 'My Support Tickets' : 'Assigned Operations Queue'} ({tickets.length})
              </h3>
              <button className="btn btn-outline" style={{ padding: '6px 12px' }} onClick={loadTickets}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {loading && tickets.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>Loading tickets...</p>
            ) : tickets.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px 16px' }}>
                <LifeBuoy size={40} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
                <h4>No tickets found</h4>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
                  {user.role === 'customer' ? 'Click "New Support Ticket" to test auto-assignment!' : 'Queue is clear.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {tickets.map(ticket => {
                  const isSelected = selectedTicket?.id === ticket.id;
                  return (
                    <div 
                      key={ticket.id} 
                      onClick={() => openTicketDetail(ticket)}
                      style={{ 
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: isSelected ? '#f5f3ff' : 'white',
                        borderRadius: '10px',
                        padding: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span className={`badge badge-${ticket.status}`}>{ticket.status.replace('_', ' ')}</span>
                          <span className="badge-priority">{ticket.priority}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{ticket.id} • {ticket.category}</span>
                        </div>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </div>

                      <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '6px' }}>{ticket.subject}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {ticket.description}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <UserCheck size={14} color="#4f46e5" />
                          {ticket.agent ? `Agent: ${ticket.agent.name}` : <em style={{ color: '#d97706' }}>Unassigned (Awaiting Match)</em>}
                        </span>
                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Ticket Conversation & Audit Trail Drawer */}
          {selectedTicket && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)', minHeight: '620px', padding: 0 }}>
              
              {/* Header */}
              <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', background: '#faf5ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>TICKET #{selectedTicket.id}</span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '2px' }}>{selectedTicket.subject}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Category: <strong>{selectedTicket.category}</strong> • Priority: <strong>{selectedTicket.priority}</strong>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {user.role !== 'customer' && selectedTicket.status === 'open' && (
                      <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={() => handleStatusChange(selectedTicket.id, 'in_progress')}>
                        Mark In Progress
                      </button>
                    )}
                    {user.role !== 'customer' && selectedTicket.status !== 'resolved' && (
                      <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={() => handleStatusChange(selectedTicket.id, 'resolved')}>
                        <CheckCircle size={14} /> Resolve
                      </button>
                    )}
                  </div>
                </div>

                {/* Agent & Workload pill */}
                <div style={{ marginTop: '12px', background: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span>
                    Assigned Agent: <strong>{selectedTicket.agent ? selectedTicket.agent.name : 'None'}</strong>
                  </span>
                  <span>
                    Status: <span className={`badge badge-${selectedTicket.status}`}>{selectedTicket.status}</span>
                  </span>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '16px', borderBottom: '1px solid #e2e8f0' }}>
                  <button 
                    onClick={() => setActiveTab('conversation')}
                    style={{ 
                      background: 'none', border: 'none', padding: '8px 4px', 
                      borderBottom: activeTab === 'conversation' ? '2px solid var(--primary)' : '2px solid transparent',
                      fontWeight: 600, color: activeTab === 'conversation' ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem'
                    }}
                  >
                    <MessageSquare size={16} /> Conversation ({comments.length})
                  </button>
                  <button 
                    onClick={() => setActiveTab('audit')}
                    style={{ 
                      background: 'none', border: 'none', padding: '8px 4px', 
                      borderBottom: activeTab === 'audit' ? '2px solid var(--primary)' : '2px solid transparent',
                      fontWeight: 600, color: activeTab === 'audit' ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem'
                    }}
                  >
                    <History size={16} /> Audit Trail & History ({history.length})
                  </button>
                </div>
              </div>

              {/* Tab Content Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                {activeTab === 'conversation' ? (
                  <div>
                    {/* Initial Ticket Description */}
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>INITIAL ISSUE DESCRIPTION</span>
                      <p style={{ marginTop: '6px', fontSize: '0.9rem', lineHeight: 1.5 }}>{selectedTicket.description}</p>
                    </div>

                    {comments.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '32px' }}>
                        No messages yet. Start the conversation below.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {comments.map(c => (
                          <div 
                            key={c.id} 
                            style={{ 
                              padding: '12px 16px', 
                              borderRadius: '10px',
                              background: c.is_internal ? '#fffbeb' : (c.author_id === user.id ? '#eef2ff' : '#f1f5f9'),
                              border: c.is_internal ? '1px dashed #f59e0b' : '1px solid var(--border)',
                              alignSelf: c.author_id === user.id ? 'flex-end' : 'flex-start',
                              maxWidth: '85%'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: c.is_internal ? '#b45309' : 'var(--text-main)' }}>
                                {c.author?.name || 'User'} {c.is_internal && <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>🔒 Internal Note</span>}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: '#1e293b' }}>{c.body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Audit Trail Timeline */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                      <ShieldAlert size={16} /> Immutable Lifecycle Audit Log
                    </div>
                    {history.map(h => (
                      <div key={h.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)', marginTop: '6px' }} />
                        <div style={{ flex: 1, background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            <strong style={{ textTransform: 'uppercase', color: 'var(--primary)' }}>{h.action}</strong>
                            <span>{new Date(h.created_at).toLocaleString()}</span>
                          </div>
                          <p style={{ fontSize: '0.85rem', color: '#334155' }}>{h.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comment Input Footer */}
              {activeTab === 'conversation' && (
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'white' }}>
                  <form onSubmit={handlePostComment}>
                    {user.role !== 'customer' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.8rem', color: '#b45309' }}>
                        <input 
                          type="checkbox" 
                          id="internalNote" 
                          checked={isInternalNote} 
                          onChange={e => setIsInternalNote(e.target.checked)} 
                        />
                        <label htmlFor="internalNote" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Lock size={12} /> Make this a private Internal Note (hidden from customer)
                        </label>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        className="form-control" 
                        value={newComment} 
                        onChange={e => setNewComment(e.target.value)} 
                        placeholder={isInternalNote ? "Write private agent note..." : "Type reply to customer..."} 
                      />
                      <button className="btn btn-primary" type="submit">
                        <Send size={16} /> Send
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Create Ticket Modal */}
        {showCreateModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
            <div className="card" style={{ width: '100%', maxWidth: '520px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '1.25rem', fontWeight: 700 }}>Raise Support Ticket</h3>
              <form onSubmit={handleCreateTicket}>
                <div className="form-group">
                  <label>Subject</label>
                  <input className="form-control" required value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Double deduction during UPI payment" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Category (Triggers Skill Match)</label>
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
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="form-control" rows={4} required value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue with order IDs, timestamps..." />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Assigning...' : 'Submit & Auto-Assign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;

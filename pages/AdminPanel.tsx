import React, { useState, useEffect } from 'react';
import { AdminStats, User, UserRole, CreditReport, Transaction, PricingConfig, Bureau } from '../types';
import * as API from '../services/api';
import { Button, Input, Card, Badge } from '../components/ui';
import { CreditReportTemplate } from '../components/CreditReportTemplate';
import { Users, FileText, TrendingUp, Search, LogOut, Briefcase, Database, Plus, X, DollarSign, Filter, Wallet, ArrowRight, Pencil, Trash2, Printer, Download, Settings } from 'lucide-react';

interface Props {
  onLogout: () => void;
}

export const AdminPanel: React.FC<Props> = ({ onLogout }) => {
  const [tab, setTab] = useState<'dashboard' | 'users' | 'partners' | 'reports' | 'transactions' | 'settings'>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<(CreditReport & { customerName: string, generatorName: string, partnerFranchiseId?: string })[]>([]);
  const [transactions, setTransactions] = useState<(Transaction & { userEmail?: string })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [showAddPartner, setShowAddPartner] = useState(false);
  const [partnerForm, setPartnerForm] = useState({ fullName: '', email: '', mobile: '', pan: '', password: '' });

  const [editingPartner, setEditingPartner] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', mobile: '', pan: '', password: '' });

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletPartner, setWalletPartner] = useState<User | null>(null);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletAction, setWalletAction] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [walletDescription, setWalletDescription] = useState('');

  const [selectedReport, setSelectedReport] = useState<{ report: CreditReport, user: User } | null>(null);
  
  const [reportFilter, setReportFilter] = useState({
      partner: '',
      type: 'ALL',
      dateFrom: '',
      dateTo: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const s = await API.getAdminStats();
    const u = await API.getAllUsers();
    const r = await API.getAllReports();
    const tx = await API.getTransactions('MASTER_ADMIN');
    const pc = await API.getPricing();

    const enrichedTxs = tx.map(t => {
        const usr = u.find(user => user.id === t.userId);
        return { ...t, userEmail: usr?.email || 'Unknown' };
    });

    setStats(s);
    setUsers(u);
    // Sort reports desc
    setReports(r.sort((a,b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()));
    setTransactions(enrichedTxs);
    setPricingConfig(pc);
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if(!confirm(`Are you sure you want to change this user to ${newRole}?`)) return;
    setLoading(true);
    await API.updateUserRole(userId, newRole);
    await loadData();
    setLoading(false);
  };

  const handleAddPartner = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          await API.createPartner(partnerForm);
          alert('Partner Created Successfully');
          setShowAddPartner(false);
          setPartnerForm({ fullName: '', email: '', mobile: '', pan: '', password: '' });
          await loadData();
      } catch (err: any) {
          alert(err.message || 'Failed to create partner');
      } finally {
          setLoading(false);
      }
  };

  const initiateEditPartner = (partner: User) => {
      setEditingPartner(partner);
      setEditForm({
          fullName: partner.fullName,
          email: partner.email,
          mobile: partner.mobile,
          pan: partner.pan,
          password: partner.password || ''
      });
  };

  const handleUpdatePartner = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingPartner) return;
      setLoading(true);
      try {
          await API.updateUser(editingPartner.id, {
              fullName: editForm.fullName,
              email: editForm.email,
              mobile: editForm.mobile,
              pan: editForm.pan,
              password: editForm.password
          });
          alert("Partner updated successfully");
          setEditingPartner(null);
          await loadData();
      } catch (err: any) {
          alert(err.message);
      } finally {
          setLoading(false);
      }
  };

  const handleDeletePartner = async (partnerId: string) => {
      if (!confirm("Are you sure you want to delete this partner/franchise? This action cannot be undone.")) return;
      setLoading(true);
      try {
          await API.deleteUser(partnerId);
          await loadData();
      } catch (err: any) {
          alert(err.message);
      } finally {
          setLoading(false);
      }
  };

  const handleWalletAdjustment = async () => {
      if(!walletPartner || !walletAmount) return;
      setLoading(true);
      try {
          await API.adjustPartnerWallet(walletPartner.id, parseInt(walletAmount), walletAction, walletDescription);
          alert(`Successfully ${walletAction === 'CREDIT' ? 'added' : 'deducted'} funds.`);
          setShowWalletModal(false);
          setWalletAmount('');
          setWalletDescription('');
          await loadData();
      } catch (err: any) {
          alert(err.message);
      } finally {
          setLoading(false);
      }
  };

  const handleSavePricing = async () => {
      if(!pricingConfig) return;
      setIsSavingSettings(true);
      await API.updatePricing(pricingConfig);
      setIsSavingSettings(false);
      alert("Pricing configuration updated successfully.");
  };

  const openReport = async (reportId: string, userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    const targetReport = reports.find(r => r.id === reportId);
    if(targetUser && targetReport) {
        setSelectedReport({ report: targetReport, user: targetUser });
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.pan.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.mobile.includes(searchTerm)
  );

  const partners = users.filter(u => u.role === 'PARTNER_ADMIN');
  
  const filteredReports = reports.filter(r => {
      const searchMatch = r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || r.controlNumber.includes(searchTerm);
      const partnerMatch = reportFilter.partner ? r.generatedBy === reportFilter.partner : true;
      // Reports no longer have paymentType directly, inferred or check existing logic? 
      // Assuming version 1 = initial, >1 refresh or adding paymentType back to updated struct if needed.
      // For now, removing precise type filtering or mapping version 1 to INITIAL
      const typeMatch = reportFilter.type !== 'ALL' 
         ? (reportFilter.type === 'INITIAL' ? r.version === 1 : r.version > 1) 
         : true;
      
      let dateMatch = true;
      const rDate = new Date(r.reportDate).getTime();
      if (reportFilter.dateFrom) dateMatch = dateMatch && rDate >= new Date(reportFilter.dateFrom).getTime();
      if (reportFilter.dateTo) dateMatch = dateMatch && rDate <= new Date(reportFilter.dateTo).setHours(23,59,59);

      return searchMatch && partnerMatch && typeMatch && dateMatch;
  });

  if (loading && !stats) return <div className="flex h-screen items-center justify-center">Loading Master Admin...</div>;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      
      {/* Detail Modal */}
      {selectedReport && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-hidden">
              <div className="bg-white w-full max-w-[210mm] h-[90vh] rounded-xl shadow-2xl relative flex flex-col">
                  {/* Toolbar */}
                  <div className="flex justify-between items-center p-4 border-b bg-slate-50 rounded-t-xl no-print">
                      <h3 className="font-bold text-slate-700">Report Preview: {selectedReport.report.bureau}</h3>
                      <div className="flex items-center gap-3">
                          <Button 
                            variant="outline" 
                            className="text-sm h-9 border-slate-300 text-slate-700 bg-white"
                            onClick={() => window.print()}
                          >
                             <Printer size={16} className="mr-2"/> Print
                          </Button>
                          <button onClick={() => setSelectedReport(null)} className="ml-2 text-slate-400 hover:text-red-500">
                             <X size={24}/>
                          </button>
                      </div>
                  </div>

                  <div className="overflow-y-auto flex-1 p-8 bg-slate-500/10 printable-report">
                      <div className="bg-white shadow-lg mx-auto max-w-[210mm] p-8 min-h-[297mm]">
                          <CreditReportTemplate report={selectedReport.report} user={selectedReport.user} />
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Partner Modal */}
      {editingPartner && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-lg bg-white relative animate-fadeIn">
                  <button onClick={() => setEditingPartner(null)} className="absolute top-4 right-4 text-slate-500"><X size={20}/></button>
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Pencil size={20} className="text-brand-600"/> Edit Partner Details</h3>
                  <form onSubmit={handleUpdatePartner} className="space-y-4">
                      <Input label="Full Name" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} required />
                      <Input label="Email" type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} required />
                      <Input label="Mobile" value={editForm.mobile} onChange={e => setEditForm({...editForm, mobile: e.target.value})} required maxLength={10} />
                      <Input label="PAN Number" value={editForm.pan} onChange={e => setEditForm({...editForm, pan: e.target.value})} required className="uppercase" maxLength={10} />
                      <div className="border-t pt-4 mt-2">
                          <label className="text-sm font-bold text-slate-700 block mb-2">Update Password</label>
                          <Input label="New Password" type="text" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} required placeholder="Enter new password" />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" isLoading={loading} className="flex-1">Update Details</Button>
                        <Button type="button" variant="secondary" onClick={() => setEditingPartner(null)} className="flex-1">Cancel</Button>
                      </div>
                  </form>
              </Card>
          </div>
      )}

      {/* Wallet Management Modal */}
      {showWalletModal && walletPartner && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-md bg-white relative animate-fadeIn">
                   <button onClick={() => setShowWalletModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-black"><X size={20}/></button>
                   <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                       <Wallet className="text-brand-600"/> Manage Wallet
                   </h3>
                   <p className="text-sm text-slate-500 mb-6">Partner: {walletPartner.fullName} ({walletPartner.franchiseId})</p>
                   
                   <div className="bg-slate-50 p-4 rounded-lg mb-6 flex justify-between items-center">
                        <span className="text-sm font-semibold text-slate-600">Current Balance</span>
                        <span className="text-2xl font-bold text-slate-800">₹{walletPartner.walletBalance || 0}</span>
                   </div>

                   <div className="flex gap-4 mb-6">
                        <button 
                            onClick={() => setWalletAction('CREDIT')}
                            className={`flex-1 py-3 rounded-lg border-2 font-bold flex items-center justify-center gap-2 ${walletAction === 'CREDIT' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-500'}`}
                        >
                            <Plus size={16}/> Add Funds
                        </button>
                        <button 
                             onClick={() => setWalletAction('DEBIT')}
                             className={`flex-1 py-3 rounded-lg border-2 font-bold flex items-center justify-center gap-2 ${walletAction === 'DEBIT' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500'}`}
                        >
                            <ArrowRight size={16}/> Deduct
                        </button>
                   </div>

                   <div className="space-y-4">
                       <Input label="Amount (₹)" type="number" value={walletAmount} onChange={e => setWalletAmount(e.target.value)} required placeholder="0.00" />
                       <Input label="Description / Reason" value={walletDescription} onChange={e => setWalletDescription(e.target.value)} placeholder="e.g. Bonus, Correction, Refund" />
                       
                       <Button onClick={handleWalletAdjustment} isLoading={loading} className="w-full">
                           {walletAction === 'CREDIT' ? 'Credit Amount' : 'Debit Amount'}
                       </Button>
                   </div>
              </Card>
          </div>
      )}

      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 no-print">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-wider">MASTER<span className="text-brand-500">ADMIN</span></h1>
        </div>
        <nav className="p-4 space-y-2">
          <button onClick={() => setTab('dashboard')} className={`w-full flex items-center p-3 rounded-lg ${tab === 'dashboard' ? 'bg-brand-600' : 'hover:bg-slate-800'}`}>
            <TrendingUp size={20} className="mr-3" /> Dashboard
          </button>
          <button onClick={() => setTab('users')} className={`w-full flex items-center p-3 rounded-lg ${tab === 'users' ? 'bg-brand-600' : 'hover:bg-slate-800'}`}>
            <Users size={20} className="mr-3" /> User Management
          </button>
          <button onClick={() => setTab('partners')} className={`w-full flex items-center p-3 rounded-lg ${tab === 'partners' ? 'bg-brand-600' : 'hover:bg-slate-800'}`}>
            <Briefcase size={20} className="mr-3" /> Partners & Franchises
          </button>
          <button onClick={() => setTab('reports')} className={`w-full flex items-center p-3 rounded-lg ${tab === 'reports' ? 'bg-brand-600' : 'hover:bg-slate-800'}`}>
            <Database size={20} className="mr-3" /> Reports Repository
          </button>
          <button onClick={() => setTab('transactions')} className={`w-full flex items-center p-3 rounded-lg ${tab === 'transactions' ? 'bg-brand-600' : 'hover:bg-slate-800'}`}>
            <DollarSign size={20} className="mr-3" /> Transactions
          </button>
           <button onClick={() => setTab('settings')} className={`w-full flex items-center p-3 rounded-lg ${tab === 'settings' ? 'bg-brand-600' : 'hover:bg-slate-800'}`}>
            <Settings size={20} className="mr-3" /> Global Settings
          </button>
        </nav>
        <div className="absolute bottom-0 w-full md:w-64 p-4 border-t border-slate-800">
          <button onClick={onLogout} className="w-full flex items-center p-3 text-red-400 hover:bg-slate-800 rounded-lg">
            <LogOut size={20} className="mr-3" /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto h-screen no-print">
        {tab === 'dashboard' && stats && (
          <div className="space-y-8 animate-fadeIn">
            <h2 className="text-2xl font-bold text-slate-800">Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="flex items-center p-6 border-l-4 border-brand-500">
                <div className="p-3 bg-brand-50 rounded-full mr-4"><Users /></div>
                <div><p className="text-slate-500 text-sm">Total Users</p><p className="text-2xl font-bold">{stats.totalUsers}</p></div>
              </Card>
              <Card className="flex items-center p-6 border-l-4 border-green-500">
                <div className="p-3 bg-green-50 rounded-full mr-4"><TrendingUp /></div>
                <div><p className="text-slate-500 text-sm">Total Revenue</p><p className="text-2xl font-bold">₹{stats.totalRevenue}</p></div>
              </Card>
              <Card className="flex items-center p-6 border-l-4 border-purple-500">
                 <div className="p-3 bg-purple-50 rounded-full mr-4"><Briefcase /></div>
                 <div><p className="text-slate-500 text-sm">Active Partners</p><p className="text-2xl font-bold">{partners.length}</p></div>
              </Card>
              <Card className="flex items-center p-6 border-l-4 border-orange-500">
                 <div className="p-3 bg-orange-50 rounded-full mr-4"><FileText /></div>
                 <div><p className="text-slate-500 text-sm">Total Reports</p><p className="text-2xl font-bold">{stats.totalReports}</p></div>
              </Card>
            </div>
          </div>
        )}

        {tab === 'users' && (
           <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
              <div className="relative">
                 <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                 <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 border rounded-lg w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <Card className="overflow-hidden p-0">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b">
                       <tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y">
                       {filteredUsers.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50">
                             <td className="px-6 py-4">
                                <p className="font-bold">{u.fullName}</p>
                                <p className="text-xs text-slate-500">{u.email} | {u.mobile}</p>
                             </td>
                             <td className="px-6 py-4"><Badge color={u.role === 'MASTER_ADMIN' ? 'red' : u.role === 'PARTNER_ADMIN' ? 'green' : 'blue'}>{u.role}</Badge></td>
                             <td className="px-6 py-4 flex gap-2">
                                {u.role === 'USER' && (
                                   <Button variant="secondary" className="text-xs h-8" onClick={() => handleRoleChange(u.id, 'PARTNER_ADMIN')}>Promote to Partner</Button>
                                )}
                                {u.role === 'PARTNER_ADMIN' && (
                                   <Button variant="danger" className="text-xs h-8" onClick={() => handleRoleChange(u.id, 'USER')}>Revoke Partner</Button>
                                )}
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </Card>
           </div>
        )}

        {tab === 'partners' && (
           <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-bold text-slate-800">Partner & Franchise Management</h2>
                 <Button onClick={() => setShowAddPartner(true)}><Plus size={16} className="mr-2"/> Add Partner</Button>
              </div>

              {showAddPartner && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                      <Card className="w-full max-w-lg bg-white relative animate-fadeIn">
                          <button onClick={() => setShowAddPartner(false)} className="absolute top-4 right-4 text-slate-500"><X size={20}/></button>
                          <h3 className="text-xl font-bold mb-6">Create New Partner</h3>
                          <form onSubmit={handleAddPartner} className="space-y-4">
                              <Input label="Full Name" value={partnerForm.fullName} onChange={e => setPartnerForm({...partnerForm, fullName: e.target.value})} required />
                              <Input label="Email" type="email" value={partnerForm.email} onChange={e => setPartnerForm({...partnerForm, email: e.target.value})} required />
                              <Input label="Mobile" value={partnerForm.mobile} onChange={e => setPartnerForm({...partnerForm, mobile: e.target.value})} required maxLength={10} />
                              <Input label="PAN Number" value={partnerForm.pan} onChange={e => setPartnerForm({...partnerForm, pan: e.target.value})} required className="uppercase" maxLength={10} />
                              <Input label="Set Password" type="password" value={partnerForm.password} onChange={e => setPartnerForm({...partnerForm, password: e.target.value})} required />
                              <Button type="submit" isLoading={loading} className="w-full">Create Partner Account</Button>
                          </form>
                      </Card>
                  </div>
              )}

              <Card className="overflow-hidden p-0">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b">
                       <tr>
                          <th className="px-6 py-4">Partner Name</th>
                          <th className="px-6 py-4">Login Details</th>
                          <th className="px-6 py-4">Franchise ID</th>
                          <th className="px-6 py-4">Wallet Balance</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y">
                       {partners.map(p => (
                          <tr key={p.id}>
                             <td className="px-6 py-4 font-bold">{p.fullName}</td>
                             <td className="px-6 py-4 text-xs">
                                <div>Email: {p.email}</div>
                                <div>Mobile: {p.mobile}</div>
                             </td>
                             <td className="px-6 py-4 font-mono text-brand-600">{p.franchiseId}</td>
                             <td className="px-6 py-4 font-bold">₹{p.walletBalance || 0}</td>
                             <td className="px-6 py-4"><Badge color="green">Active</Badge></td>
                             <td className="px-6 py-4 flex gap-2">
                                 <Button 
                                    variant="outline" 
                                    className="text-xs h-8 border-slate-300 text-slate-600 hover:bg-slate-50"
                                    onClick={() => {
                                        setWalletPartner(p);
                                        setWalletAmount('');
                                        setWalletDescription('');
                                        setWalletAction('CREDIT');
                                        setShowWalletModal(true);
                                    }}
                                 >
                                    <Wallet size={14} className="mr-2"/> Wallet
                                 </Button>
                                 <Button 
                                    variant="outline"
                                    className="text-xs h-8 border-slate-300 text-blue-600 hover:bg-blue-50 px-2"
                                    onClick={() => initiateEditPartner(p)}
                                    title="Edit Partner"
                                 >
                                    <Pencil size={14} />
                                 </Button>
                                 <Button 
                                    variant="outline"
                                    className="text-xs h-8 border-slate-300 text-red-600 hover:bg-red-50 px-2"
                                    onClick={() => handleDeletePartner(p.id)}
                                    title="Delete Partner"
                                 >
                                    <Trash2 size={14} />
                                 </Button>
                             </td>
                          </tr>
                       ))}
                       {partners.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No active partners found.</td></tr>}
                    </tbody>
                 </table>
              </Card>
           </div>
        )}

        {tab === 'reports' && (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-800">Centralized Reports Repository</h2>
                <div className="flex flex-col xl:flex-row gap-4 mb-4 items-end">
                    <Input label="Search" placeholder="Search by customer name/PAN..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full xl:w-64 mb-0" />
                    
                    <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                        <div className="w-full md:w-48">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Filter by Partner</label>
                            <select 
                                value={reportFilter.partner}
                                onChange={e => setReportFilter(p => ({...p, partner: e.target.value}))}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            >
                                <option value="">All Sources</option>
                                {partners.map(p => (
                                    <option key={p.id} value={p.id}>{p.fullName} ({p.franchiseId})</option>
                                ))}
                            </select>
                        </div>

                        <div className="w-full md:w-auto flex gap-2">
                             <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">From</label>
                                <input type="date" className="px-2 py-2 border rounded-lg" value={reportFilter.dateFrom} onChange={e => setReportFilter(p => ({...p, dateFrom: e.target.value}))} />
                             </div>
                             <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">To</label>
                                <input type="date" className="px-2 py-2 border rounded-lg" value={reportFilter.dateTo} onChange={e => setReportFilter(p => ({...p, dateTo: e.target.value}))} />
                             </div>
                        </div>
                    </div>
                </div>

                <Card className="overflow-hidden p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Generated By</th>
                                <th className="px-6 py-4">Bureau</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredReports.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-xs">{new Date(r.reportDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold">{r.customerName}</div>
                                        <div className="text-xs text-slate-500">Ref: {r.referenceId}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge color={r.userId === r.generatedBy ? 'blue' : 'purple'}>
                                            {r.userId === r.generatedBy ? 'Self' : `Partner: ${r.partnerFranchiseId}`}
                                        </Badge>
                                        {r.userId !== r.generatedBy && <div className="text-xs mt-1">{r.generatorName}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge color="blue">{r.bureau}</Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge color={r.status === 'SUCCESS' ? 'green' : r.status === 'FAILED' ? 'red' : 'yellow'}>{r.status}</Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Button variant="outline" className="text-xs h-8" onClick={() => openReport(r.id, r.userId)}>Full Report</Button>
                                    </td>
                                </tr>
                            ))}
                            {filteredReports.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No reports found matching filters.</td></tr>}
                        </tbody>
                    </table>
                </Card>
            </div>
        )}
        
        {tab === 'transactions' && (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-800">Transaction History</h2>
                <Card className="overflow-hidden p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-6 py-4">TXN ID</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {transactions.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-mono text-xs">{t.id}</td>
                                    <td className="px-6 py-4">{t.userEmail}</td>
                                    <td className="px-6 py-4">
                                        <Badge color={
                                            t.type === 'INITIAL' ? 'blue' : 
                                            t.type === 'REFRESH' ? 'yellow' : 
                                            t.type === 'ADMIN_ADJUSTMENT' ? 'purple' : 'green'
                                        }>{t.type}</Badge>
                                    </td>
                                    <td className="px-6 py-4 text-xs italic text-slate-500">{t.description || '-'}</td>
                                    <td className={`px-6 py-4 font-bold ${t.type === 'ADMIN_ADJUSTMENT' && t.description?.includes('DEBIT') ? 'text-red-600' : 'text-green-700'}`}>
                                        {t.type === 'ADMIN_ADJUSTMENT' && t.description?.includes('DEBIT') ? '-' : ''}₹{t.amount}
                                    </td>
                                    <td className="px-6 py-4 text-xs">{new Date(t.date).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            </div>
        )}

        {tab === 'settings' && pricingConfig && (
            <div className="space-y-6 animate-fadeIn">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Settings size={24} className="text-brand-600" /> 
                    Global Pricing Configuration
                </h2>
                <p className="text-slate-500">
                    Manage the cost of credit reports for each bureau. 
                    Changes here will immediately affect new transactions for Partners and Regular Users.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                    {/* Partner Pricing */}
                    <Card className="border-t-4 border-brand-500">
                        <h3 className="text-lg font-bold text-brand-800 mb-4 flex items-center gap-2">
                            <Briefcase size={18} /> Partner Pricing (per Report)
                        </h3>
                        <div className="space-y-4">
                            {(['CIBIL', 'EXPERIAN', 'EQUIFAX', 'CRIF'] as Bureau[]).map(b => (
                                <div key={b} className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-700 w-32">{b}</span>
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-2 text-slate-400">₹</span>
                                        <input 
                                            type="number" 
                                            value={pricingConfig.PARTNER[b]} 
                                            onChange={e => setPricingConfig({
                                                ...pricingConfig, 
                                                PARTNER: { ...pricingConfig.PARTNER, [b]: parseInt(e.target.value) || 0 }
                                            })}
                                            className="w-full border p-2 pl-6 rounded"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* User Pricing */}
                    <Card className="border-t-4 border-purple-500">
                        <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">
                            <Users size={18} /> Regular User Pricing (per Report)
                        </h3>
                         <div className="space-y-4">
                            {(['CIBIL', 'EXPERIAN', 'EQUIFAX', 'CRIF'] as Bureau[]).map(b => (
                                <div key={b} className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-700 w-32">{b}</span>
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-2 text-slate-400">₹</span>
                                        <input 
                                            type="number" 
                                            value={pricingConfig.USER[b]} 
                                            onChange={e => setPricingConfig({
                                                ...pricingConfig, 
                                                USER: { ...pricingConfig.USER, [b]: parseInt(e.target.value) || 0 }
                                            })}
                                            className="w-full border p-2 pl-6 rounded"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
                
                <div className="flex justify-end pt-4">
                    <Button onClick={handleSavePricing} isLoading={isSavingSettings} className="px-8 py-3 text-lg">
                        Save Pricing Changes
                    </Button>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};
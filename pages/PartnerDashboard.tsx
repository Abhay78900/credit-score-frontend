import React, { useEffect, useState } from 'react';
import { User, Transaction, Bureau, CreditReport, PricingConfig } from '../types';
import * as API from '../services/api';
import { Button, Card, Badge, Input } from '../components/ui';
import { CreditReportTemplate } from '../components/CreditReportTemplate';
import { RefreshCw, Users, DollarSign, FileText, LogOut, Check, Wallet, History, Plus, Search, X, ArrowUpRight, ArrowDownLeft, Clock, Printer, Download, CreditCard, ShieldCheck, Loader2, ChevronDown } from 'lucide-react';

interface Props {
  user: User;
  onLogout: () => void;
  navigate: (view: any) => void;
}

export const PartnerDashboard: React.FC<Props> = ({ user, onLogout, navigate }) => {
  const [tab, setTab] = useState<'overview' | 'reports' | 'wallet'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reports, setReports] = useState<(CreditReport & { customerName: string, transactionAmount?: number })[]>([]);
  const [loading, setLoading] = useState(true);

  // Wallet & Gateway State
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('1000');
  const [paymentStep, setPaymentStep] = useState<'INPUT' | 'GATEWAY' | 'SUCCESS'>('INPUT');

  // Quick Report Generation State
  const [customerForm, setCustomerForm] = useState({ fullName: '', pan: '', mobile: '', email: '', dob: '', address: '' });
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  // Default to EXPERIAN as requested
  const [selectedBureaus, setSelectedBureaus] = useState<Bureau[]>(['EXPERIAN']);
  const [bureauDropdownOpen, setBureauDropdownOpen] = useState(false);

  // Report View State
  const [selectedReport, setSelectedReport] = useState<{ report: CreditReport, user: User } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pricing
  const [pricing, setPricing] = useState<PricingConfig | null>(null);

  useEffect(() => {
    loadData();
  }, [user.id, user.walletBalance]); 

  const loadData = async () => {
    setLoading(true);
    const s = await API.getPartnerStats(user.id);
    const t = await API.getTransactions('PARTNER_ADMIN', user.id);
    const r = await API.getPartnerReports(user.id);
    const pc = await API.getPricing();
    
    setStats(s);
    setTransactions(t);
    // Sort reports desc
    setReports(r.sort((a,b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()));
    setPricing(pc);
    setLoading(false);
  };

  const handleTopUp = async () => {
    setPaymentStep('GATEWAY');
    
    // Simulate Gateway Processing Delay
    setTimeout(async () => {
        setPaymentStep('SUCCESS');
        await API.loadWalletFunds(user.id, parseInt(topUpAmount));
        
        // Close modal after showing success
        setTimeout(() => {
            setShowTopUp(false);
            setPaymentStep('INPUT');
            loadData();
        }, 1500);
    }, 2500);
  };

  const getPartnerCost = () => {
      if (!pricing) return 0;
      return selectedBureaus.reduce((acc, b) => acc + pricing.PARTNER[b], 0);
  }

  const handleCreateCustomerReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if(selectedBureaus.length === 0) {
        alert("Please select at least one bureau");
        return;
    }

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(customerForm.pan)) {
        alert("Invalid PAN Number format.");
        return;
    }

    const cost = getPartnerCost();

    if ((stats.walletBalance || 0) < cost) {
        alert(`Insufficient Wallet Balance. Required: ₹${cost}, Available: ₹${stats.walletBalance}`);
        return;
    }

    setGenerating(true);
    
    const newUser = await API.registerUser({
        ...customerForm,
        referredBy: user.franchiseId
    });

    const txnId = await API.processPayment(user.id, selectedBureaus, cost, 'WALLET', 'INITIAL');
    
    if (txnId) {
        await API.generateReportsBatch(newUser.id, user.id, selectedBureaus, 'INITIAL', txnId);
        alert(`Reports Generated Successfully for ${newUser.fullName}. deducted ₹${cost} from wallet.`);
        setShowForm(false);
        setCustomerForm({ fullName: '', pan: '', mobile: '', email: '', dob: '', address: '' });
        loadData(); 
    } else {
        alert("Payment Failed. Please try again.");
    }
    setGenerating(false);
  };

  const openReport = async (reportId: string, userId: string) => {
      const allUsers = await API.getAllUsers();
      const targetUser = allUsers.find(u => u.id === userId);
      const reports = await API.getPartnerReports(user.id);
      const targetReport = reports.find(r => r.id === reportId);
      
      if(targetUser && targetReport) {
          setSelectedReport({ report: targetReport, user: targetUser });
      }
  };

  if (loading || !stats) return <div className="h-screen flex items-center justify-center">Loading Franchise Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      
      {/* Full Report Modal */}
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

      {/* Navbar */}
      <nav className="bg-slate-900 text-white h-16 px-6 flex items-center justify-between sticky top-0 z-40 no-print">
         <div className="flex items-center gap-2">
            <span className="font-bold text-xl tracking-wider">CREDI<span className="text-brand-400">PARTNER</span></span>
            <Badge color="blue">{user.franchiseId}</Badge>
         </div>
         <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden md:inline">Welcome, {user.fullName}</span>
            <Button variant="danger" className="h-9 text-xs" onClick={onLogout}>Logout</Button>
         </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 space-y-8 no-print">
         
         <div className="flex space-x-4 border-b border-slate-300 pb-2 overflow-x-auto">
             <button 
                onClick={() => setTab('overview')} 
                className={`px-4 py-2 font-bold rounded-lg flex items-center gap-2 whitespace-nowrap ${tab === 'overview' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
             >
                <Users size={18} /> Overview
             </button>
             <button 
                onClick={() => setTab('reports')} 
                className={`px-4 py-2 font-bold rounded-lg flex items-center gap-2 whitespace-nowrap ${tab === 'reports' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
             >
                <FileText size={18} /> Report History
             </button>
             <button 
                onClick={() => setTab('wallet')} 
                className={`px-4 py-2 font-bold rounded-lg flex items-center gap-2 whitespace-nowrap ${tab === 'wallet' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
             >
                <Wallet size={18} /> Wallet History
             </button>
         </div>

         {/* OVERVIEW TAB */}
         {tab === 'overview' && (
             <div className="space-y-8 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="flex items-center justify-between p-6 border-l-4 border-green-500 bg-white">
                        <div className="flex items-center">
                            <div className="p-4 bg-green-50 rounded-full mr-4"><Wallet className="text-green-600"/></div>
                            <div>
                                <div className="text-slate-500 text-sm">Wallet Balance</div>
                                <div className="text-3xl font-bold text-slate-800">₹{stats.walletBalance}</div>
                            </div>
                        </div>
                        <Button variant="outline" className="h-10 text-xs" onClick={() => setShowTopUp(true)}><Plus size={16} className="mr-2"/> Add Funds</Button>
                    </Card>
                    <Card className="flex items-center p-6 border-l-4 border-brand-500">
                        <div className="p-4 bg-brand-50 rounded-full mr-4"><FileText className="text-brand-600"/></div>
                        <div>
                            <div className="text-slate-500 text-sm">Reports Generated</div>
                            <div className="text-2xl font-bold">{stats.reportsSold}</div>
                        </div>
                    </Card>
                    <Card className="flex items-center p-6 border-l-4 border-purple-500">
                        <div className="p-4 bg-purple-50 rounded-full mr-4"><Users className="text-purple-600"/></div>
                        <div>
                            <div className="text-slate-500 text-sm">Customers Served</div>
                            <div className="text-2xl font-bold">{transactions.filter(t => t.type === 'INITIAL' || t.type === 'REFRESH').length}</div>
                        </div>
                    </Card>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center"><Users className="mr-2"/> Client Management</h2>
                        <Button onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Cancel Generation' : '+ Generate New Report'}
                        </Button>
                    </div>

                    {showForm && (
                        <Card className="bg-white border-2 border-brand-100 animate-fadeIn">
                            <h3 className="font-bold text-lg mb-4 text-brand-800">Generate New Report</h3>
                            <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded mb-6 text-sm">
                                Estimated Cost: ₹{getPartnerCost()}. Amount will be deducted from your wallet balance of ₹{stats.walletBalance}.
                            </div>
                            <form onSubmit={handleCreateCustomerReport} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Customer Name" value={customerForm.fullName} onChange={e => setCustomerForm({...customerForm, fullName: e.target.value})} required />
                                <Input 
                                    label="PAN" 
                                    value={customerForm.pan} 
                                    onChange={e => setCustomerForm({...customerForm, pan: e.target.value.toUpperCase()})} 
                                    required 
                                    maxLength={10} 
                                    placeholder="ABCDE1234F"
                                />
                                <Input label="Mobile" value={customerForm.mobile} onChange={e => setCustomerForm({...customerForm, mobile: e.target.value})} required maxLength={10} />
                                <Input label="Email" value={customerForm.email} onChange={e => setCustomerForm({...customerForm, email: e.target.value})} required />
                                <Input label="DOB" type="date" value={customerForm.dob} onChange={e => setCustomerForm({...customerForm, dob: e.target.value})} required />
                                
                                <div className="md:col-span-2 relative">
                                    <label className="text-sm font-bold block mb-2">Select Bureaus</label>
                                    <div 
                                        className="w-full border border-slate-300 rounded-lg px-4 py-2 bg-white cursor-pointer flex justify-between items-center hover:border-brand-500"
                                        onClick={() => setBureauDropdownOpen(!bureauDropdownOpen)}
                                    >
                                        <span className={selectedBureaus.length ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                                            {selectedBureaus.length > 0 ? selectedBureaus.join(', ') : 'Select Bureaus'}
                                        </span>
                                        <ChevronDown size={16} className={`transition-transform ${bureauDropdownOpen ? 'rotate-180' : ''}`}/>
                                    </div>
                                    
                                    {bureauDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 p-2 max-h-60 overflow-y-auto">
                                            {['EXPERIAN', 'CIBIL', 'EQUIFAX', 'CRIF'].map(b => (
                                                <label key={b} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded cursor-pointer border-b last:border-0 border-slate-50">
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedBureaus.includes(b as Bureau) ? 'bg-brand-600 border-brand-600' : 'bg-white border-slate-300'}`}>
                                                        {selectedBureaus.includes(b as Bureau) && <Check size={14} className="text-white"/>}
                                                    </div>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedBureaus.includes(b as Bureau)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedBureaus([...selectedBureaus, b as Bureau]);
                                                            else setSelectedBureaus(selectedBureaus.filter(x => x !== b));
                                                        }}
                                                        className="hidden" 
                                                    />
                                                    <span className="font-semibold text-slate-700 flex-1">{b}</span>
                                                    <span className="text-sm text-slate-500">₹{pricing?.PARTNER[b as Bureau] || 0}</span>
                                                </label>
                                            ))}
                                            <div 
                                                className="text-center p-2 text-xs font-bold text-brand-600 cursor-pointer hover:bg-slate-50 rounded mt-1"
                                                onClick={() => setBureauDropdownOpen(false)}
                                            >
                                                CLOSE
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Button type="submit" isLoading={generating} className="md:col-span-2 mt-4 py-3 text-lg">
                                    Pay ₹{getPartnerCost()} & Generate
                                </Button>
                            </form>
                        </Card>
                    )}
                </div>

                <div className="mt-8">
                    <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2"><Clock size={18} /> Recently Generated Reports</h3>
                    <Card className="p-0 overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 border-b">
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Client</th>
                                    <th className="px-6 py-3">Bureau</th>
                                    <th className="px-6 py-3">Score</th>
                                    <th className="px-6 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {reports.slice(0, 5).map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3">{new Date(r.reportDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-3 font-semibold">{r.customerName}</td>
                                        <td className="px-6 py-3"><Badge color="blue">{r.bureau}</Badge></td>
                                        <td className="px-6 py-3 font-bold">{r.score}</td>
                                        <td className="px-6 py-3">
                                            <button onClick={() => openReport(r.id, r.userId)} className="text-brand-600 hover:underline font-medium">View</button>
                                        </td>
                                    </tr>
                                ))}
                                {reports.length === 0 && (
                                    <tr><td colSpan={5} className="p-6 text-center text-slate-400">No reports generated yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                        {reports.length > 5 && (
                            <div className="p-3 bg-slate-50 text-center border-t">
                                <button onClick={() => setTab('reports')} className="text-sm text-brand-600 hover:text-brand-800 font-medium">View All History</button>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
         )}

         {/* REPORTS TAB */}
         {tab === 'reports' && (
            <div className="space-y-6 animate-fadeIn">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">Generated Report History</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search client name..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border rounded-lg"
                        />
                    </div>
                </div>
                
                <Card className="p-0 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 border-b">
                            <tr>
                                <th className="px-6 py-4">Date & Time</th>
                                <th className="px-6 py-4">Client Name</th>
                                <th className="px-6 py-4">Bureau</th>
                                <th className="px-6 py-4">Ref ID</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {reports
                                .filter(r => r.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map(r => (
                                <tr key={r.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-xs">{new Date(r.reportDate).toLocaleString()}</td>
                                    <td className="px-6 py-4 font-bold">{r.customerName}</td>
                                    <td className="px-6 py-4"><Badge color="blue">{r.bureau}</Badge></td>
                                    <td className="px-6 py-4 text-xs font-mono">{r.referenceId}</td>
                                    <td className="px-6 py-4">
                                        <Badge color={r.status === 'SUCCESS' ? 'green' : r.status === 'FAILED' ? 'red' : 'yellow'}>{r.status}</Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Button variant="outline" className="h-8 text-xs" onClick={() => openReport(r.id, r.userId)}>View</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            </div>
         )}

         {/* WALLET HISTORY TAB */}
         {tab === 'wallet' && (
             <div className="space-y-6 animate-fadeIn">
                 <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">Wallet Transaction History</h2>
                    <Button variant="outline" onClick={() => {
                        setPaymentStep('INPUT');
                        setShowTopUp(true);
                    }} className="gap-2"><Plus size={16}/> Add Funds</Button>
                 </div>

                 <Card className="p-0 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 border-b">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Transaction ID</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transactions.map(t => {
                                const isCredit = t.type === 'WALLET_TOPUP' || (t.type === 'ADMIN_ADJUSTMENT' && !t.description?.includes('DEBIT'));
                                const isDebit = !isCredit;
                                return (
                                <tr key={t.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-xs text-slate-600">{new Date(t.date).toLocaleString()}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{t.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {isCredit ? <ArrowDownLeft size={16} className="text-green-500"/> : <ArrowUpRight size={16} className="text-red-500"/>}
                                            <span className={`font-medium ${isCredit ? 'text-green-700' : 'text-red-700'}`}>
                                                {t.type === 'WALLET_TOPUP' ? 'Wallet Load' : t.type === 'INITIAL' ? 'Report Generation' : t.type === 'REFRESH' ? 'Report Refresh' : 'Adjustment'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500">
                                        {t.description || (t.type === 'INITIAL' || t.type === 'REFRESH' ? `Bureaus: ${t.bureaus.join(', ')}` : 'Wallet Top-up')}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                                        {isDebit ? '-' : '+'}₹{t.amount}
                                    </td>
                                </tr>
                            )})}
                            {transactions.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No transactions found.</td></tr>}
                        </tbody>
                    </table>
                 </Card>
             </div>
         )}
         
         {/* Wallet TopUp Modal / Payment Gateway */}
         {showTopUp && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md animate-fadeIn overflow-hidden">
                    
                    {paymentStep === 'INPUT' && (
                        <div className="p-6">
                            <h3 className="font-bold mb-4 flex items-center gap-2 text-xl text-slate-800"><Wallet className="text-green-600"/> Add Funds to Wallet</h3>
                            <div className="mb-6 bg-slate-50 p-4 rounded-lg">
                                <label className="text-xs font-bold text-slate-500 block mb-2 uppercase tracking-wide">Enter Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-400 text-lg">₹</span>
                                    <input 
                                        type="number" 
                                        value={topUpAmount} 
                                        onChange={e => setTopUpAmount(e.target.value)} 
                                        className="w-full border p-2 pl-8 rounded text-2xl font-bold text-slate-800 focus:ring-2 focus:ring-green-500 outline-none"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Button onClick={handleTopUp} className="flex-1 bg-green-600 hover:bg-green-700 text-white border-none py-3 text-lg">
                                    Proceed to Pay
                                </Button>
                                <Button variant="secondary" onClick={() => setShowTopUp(false)} className="flex-1">Cancel</Button>
                            </div>
                        </div>
                    )}

                    {paymentStep === 'GATEWAY' && (
                        <div className="p-8 text-center bg-slate-50 h-[300px] flex flex-col justify-center items-center">
                            <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-6"></div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Redirecting to Payment Gateway</h3>
                            <p className="text-slate-500 text-sm">Please do not close this window...</p>
                            <div className="mt-8 flex gap-2 justify-center opacity-50">
                                <CreditCard size={20} /> <ShieldCheck size={20} />
                            </div>
                        </div>
                    )}

                    {paymentStep === 'SUCCESS' && (
                        <div className="p-8 text-center h-[300px] flex flex-col justify-center items-center bg-white">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                                <Check size={32} strokeWidth={3} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Payment Successful</h3>
                            <p className="text-slate-500">₹{topUpAmount} has been added to your wallet.</p>
                        </div>
                    )}

                </div>
            </div>
         )}

      </div>
    </div>
  );
};
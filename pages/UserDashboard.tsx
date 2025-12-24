import React, { useEffect, useState } from 'react';
import { CreditReport, User, Bureau, PricingConfig } from '../types';
import { Button, Card } from '../components/ui';
import { CreditReportTemplate } from '../components/CreditReportTemplate';
import * as API from '../services/api';
import { RefreshCw, LogOut, Printer, Check, ChevronRight } from 'lucide-react';

interface Props {
  user: User;
  onLogout: () => void;
}

export const UserDashboard: React.FC<Props> = ({ user, onLogout }) => {
  const [reports, setReports] = useState<CreditReport[]>([]);
  const [activeBureau, setActiveBureau] = useState<Bureau>('EXPERIAN');
  const [loading, setLoading] = useState(true);
  
  // Refresh Payment Modal State
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [refreshBureaus, setRefreshBureaus] = useState<Bureau[]>([]);
  const [refreshLoading, setRefreshLoading] = useState(false);
  
  // Pricing
  const [pricing, setPricing] = useState<PricingConfig | null>(null);

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const fetchData = async () => {
    setLoading(true);
    const userReports = await API.getUserLatestReports(user.id);
    const pc = await API.getPricing();
    
    // Sort reports by date descending
    userReports.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
    
    setReports(userReports);
    setPricing(pc);
    setLoading(false);

    // Set active bureau to the latest report's bureau if available
    if (userReports.length > 0) {
        setActiveBureau(userReports[0].bureau);
    }
  };

  const getLatestReportForBureau = (bureau: Bureau): CreditReport | undefined => {
      return reports.find(r => r.bureau === bureau);
  }

  const activeReport = getLatestReportForBureau(activeBureau);

  const calculateRefreshCost = () => {
      if(!pricing) return 0;
      return refreshBureaus.reduce((acc, b) => acc + pricing.USER[b], 0);
  }

  const handleRefreshPayment = async () => {
    if (refreshBureaus.length === 0) return;
    setRefreshLoading(true);
    const cost = calculateRefreshCost();
    
    const txnId = await API.processPayment(user.id, refreshBureaus, cost, 'GATEWAY', 'REFRESH');
    
    if (txnId) {
        await API.generateReportsBatch(user.id, undefined, refreshBureaus, 'REFRESH', txnId);
        await fetchData();
        setShowRefreshModal(false);
        setRefreshBureaus([]);
    } else {
        alert("Payment Failed");
    }
    setRefreshLoading(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-cibil-blue font-bold">Loading Credit Reports...</div>;
  if (reports.length === 0) return <div className="p-8">No reports found. <Button onClick={() => setShowRefreshModal(true)}>Generate Now</Button></div>;

  return (
    <div className="min-h-screen bg-gray-100 font-sans print:bg-white relative">
      
      {/* Top Navigation - Hidden in Print */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 px-4 h-16 flex items-center justify-between no-print shadow-sm">
        <div className="flex items-center gap-4">
           <h1 className="text-xl font-bold text-gray-800">My Credit Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="primary" onClick={() => setShowRefreshModal(true)} className="h-9 text-xs"><RefreshCw size={14} className="mr-2"/> Refresh</Button>
           <Button variant="outline" onClick={() => window.print()} className={`h-9 text-xs border-gray-300 text-gray-600`}><Printer size={14} className="mr-2"/> Print Report</Button>
           <Button variant="secondary" onClick={onLogout} className="h-9 text-xs"><LogOut size={14} className="mr-2"/> Logout</Button>
        </div>
      </nav>

      {/* REFRESH PAYMENT MODAL */}
      {showRefreshModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 no-print">
            <Card className="w-full max-w-md animate-fadeIn bg-white relative">
                <button onClick={() => setShowRefreshModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 font-bold">X</button>
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Refresh Credit Report</h2>
                    <p className="text-sm text-gray-500 mt-2">Get latest data from bureaus.</p>
                </div>
                
                <div className="space-y-3 mb-6">
                    {['CIBIL', 'EXPERIAN', 'EQUIFAX', 'CRIF'].map((b) => {
                        const isSelected = refreshBureaus.includes(b as Bureau);
                        return (
                            <div 
                                key={b}
                                onClick={() => {
                                    if(isSelected) setRefreshBureaus(p => p.filter(x => x !== b));
                                    else setRefreshBureaus(p => [...p, b as Bureau]);
                                }}
                                className={`flex justify-between items-center p-3 rounded border cursor-pointer ${isSelected ? 'border-cibil-blue bg-blue-50' : 'border-gray-200'}`}
                            >
                                <span className="font-bold text-gray-700">{b}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm">₹{pricing?.USER[b as Bureau] || 99}</span>
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-cibil-blue border-cibil-blue' : 'bg-white border-gray-300'}`}>
                                        {isSelected && <Check size={12} className="text-white" />}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="flex justify-between items-center mb-6 pt-4 border-t">
                    <span className="font-bold text-gray-600">Total Payable</span>
                    <span className="text-2xl font-bold text-cibil-blue">₹{calculateRefreshCost()}</span>
                </div>

                <Button 
                    className="w-full py-3" 
                    onClick={handleRefreshPayment} 
                    isLoading={refreshLoading}
                    disabled={refreshBureaus.length === 0}
                >
                    Pay & Refresh Selected
                </Button>
            </Card>
        </div>
      )}

      {/* Bureau Switching Tabs */}
      <div className="max-w-[210mm] mx-auto mt-8 px-4 no-print">
         <div className="flex gap-2 border-b border-gray-300 pb-1 overflow-x-auto">
             {['CIBIL', 'EXPERIAN', 'EQUIFAX', 'CRIF'].map(b => {
                 const hasReport = !!getLatestReportForBureau(b as Bureau);
                 return (
                     <button
                        key={b}
                        onClick={() => hasReport && setActiveBureau(b as Bureau)}
                        disabled={!hasReport}
                        className={`px-6 py-2 rounded-t-lg font-bold text-sm transition-all ${
                            activeBureau === b 
                                ? 'bg-white border-x border-t border-gray-200 text-brand-600 -mb-[5px] pb-3 z-10' 
                                : hasReport ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                        }`}
                     >
                         {b}
                     </button>
                 )
             })}
         </div>
      </div>

      {/* REPORT CONTAINER - A4 Scale */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-lg mb-8 p-10 min-h-[297mm] print:shadow-none print:m-0 print:w-full print:max-w-none print:p-8 relative">
        {activeReport ? (
            <CreditReportTemplate report={activeReport} user={user} />
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
                <p>No report generated for {activeBureau}.</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowRefreshModal(true)}>Purchase Report</Button>
            </div>
        )}
      </div>
    </div>
  );
};
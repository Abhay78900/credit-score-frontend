import React, { useState, useEffect } from 'react';
import { View, User, Bureau, PricingConfig } from '../types';
import { Button, Input, Card } from '../components/ui';
import * as API from '../services/api';
import { ShieldCheck, Smartphone, CreditCard, Check, Activity, TrendingUp, Lock, Clock, ChevronDown, ChevronUp, Star, Award } from 'lucide-react';

interface Props {
  navigate: (view: View) => void;
  onUserLogin: (user: User) => void;
}

export const UserFlow: React.FC<Props> = ({ navigate, onUserLogin }) => {
  const [step, setStep] = useState<'landing' | 'form' | 'payment' | 'processing'>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    pan: '',
    mobile: '',
    email: '',
    dob: '',
    address: '',
    consent: false
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Payment State
  const [selectedBureaus, setSelectedBureaus] = useState<Bureau[]>(['EXPERIAN']);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    API.getPricing().then(setPricing);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.pan.match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/)) return "Invalid PAN format";
    if (formData.mobile.length !== 10) return "Invalid Mobile Number";
    if (!formData.consent) return "Please agree to the terms";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateForm();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setLoading(true);
    
    try {
        const user = await API.registerUser(formData);
        setCurrentUser(user);
        onUserLogin(user);
        setStep('payment');
    } catch (e: any) {
        setError(e.message || "Registration Failed");
    } finally {
        setLoading(false);
    }
  };
  
  const handlePayment = async () => {
    if (!currentUser || selectedBureaus.length === 0 || !pricing) return;
    setLoading(true);
    
    const total = selectedBureaus.reduce((acc, b) => acc + pricing.USER[b], 0);
    
    // Process Payment via GATEWAY
    const txnId = await API.processPayment(currentUser.id, selectedBureaus, total, 'GATEWAY', 'INITIAL');
    
    if (txnId) {
        setStep('processing');
        
        setTimeout(async () => {
           // Batch generate for each selected bureau
           await API.generateReportsBatch(currentUser.id, undefined, selectedBureaus, 'INITIAL', txnId);
           setLoading(false);
           
           if (currentUser.role === 'PARTNER_ADMIN') {
             navigate('PARTNER_DASHBOARD');
           } else {
             navigate('USER_DASHBOARD');
           }
        }, 2500);
    } else {
        setLoading(false);
        alert("Payment Failed");
    }
  };
  
  const toggleBureau = (b: Bureau) => {
    if (selectedBureaus.includes(b)) {
      setSelectedBureaus(prev => prev.filter(x => x !== b));
    } else {
      setSelectedBureaus(prev => [...prev, b]);
    }
  };

  const calculateTotal = () => {
      if(!pricing) return 0;
      return selectedBureaus.reduce((acc, b) => acc + pricing.USER[b], 0);
  }

  // Home Page / Landing
  if (step === 'landing') {
    return (
      <div className="flex flex-col min-h-screen bg-white font-sans text-slate-900">
        
        {/* Navbar */}
        <nav className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white/95 backdrop-blur z-50">
           <div className="text-2xl font-bold tracking-tight text-slate-900">
             Credi<span className="text-brand-600">Check</span>
           </div>
           <div className="flex gap-4">
             <button onClick={() => navigate('LOGIN')} className="font-semibold text-slate-600 hover:text-brand-600 transition-colors">Login</button>
             <Button onClick={() => setStep('form')} className="px-6 py-2 rounded-full text-sm">Check Free Score</Button>
           </div>
        </nav>

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-brand-900 text-white pt-20 pb-32 px-6">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
               <div className="inline-flex items-center gap-2 bg-brand-500/20 border border-brand-500/30 rounded-full px-4 py-1 text-sm font-medium text-brand-300">
                  <Star size={14} fill="currentColor" /> Rated #1 Credit Platform
               </div>
               <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                 Master Your Financial Health with <span className="text-brand-400">AI Precision</span>
               </h1>
               <p className="text-xl text-slate-300 max-w-lg">
                 Get your official CIBIL, Experian, Equifax, and CRIF scores instantly. No impact on your credit score.
               </p>
               <div className="flex flex-col sm:flex-row gap-4 pt-4">
                 <Button onClick={() => setStep('form')} className="h-14 px-8 text-lg bg-brand-500 hover:bg-brand-600 border-0 rounded-full shadow-lg shadow-brand-900/50">
                   Check My Score Now
                 </Button>
                 <div className="flex items-center gap-4 text-sm text-slate-400 px-4">
                    <div className="flex -space-x-2">
                       <div className="w-8 h-8 rounded-full bg-slate-600 border-2 border-slate-800"></div>
                       <div className="w-8 h-8 rounded-full bg-slate-500 border-2 border-slate-800"></div>
                       <div className="w-8 h-8 rounded-full bg-slate-400 border-2 border-slate-800 flex items-center justify-center text-[10px] text-slate-900 font-bold">+2k</div>
                    </div>
                    <p>Joined today</p>
                 </div>
               </div>
            </div>
            {/* Visual Abstract */}
            <div className="relative hidden md:block">
               <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl"></div>
               <div className="relative bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                  <div className="flex justify-between items-start mb-8">
                     <div>
                        <p className="text-sm text-slate-300">Credit Score</p>
                        <h3 className="text-4xl font-bold text-white mt-1">785</h3>
                        <p className="text-green-400 text-sm font-medium mt-1">Excellent</p>
                     </div>
                     <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                        <TrendingUp size={24} className="text-white"/>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full w-[85%] bg-green-500 rounded-full"></div>
                     </div>
                     <div className="flex justify-between text-xs text-slate-400">
                        <span>300</span>
                        <span>900</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* Bureau Logos Strip */}
        <div className="bg-slate-50 border-b border-slate-200 py-8">
           <div className="max-w-7xl mx-auto px-6 text-center">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-6">Official Partners</p>
              <div className="flex flex-wrap justify-center items-center gap-12 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                 {['CIBIL', 'EXPERIAN', 'EQUIFAX', 'CRIF'].map(b => (
                    <span key={b} className="text-2xl font-black text-slate-800">{b}</span>
                 ))}
              </div>
           </div>
        </div>

        {/* Benefits Section */}
        <section className="py-24 px-6 bg-white">
           <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                 <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Why Check Your Score with Us?</h2>
                 <p className="text-lg text-slate-600 max-w-2xl mx-auto">We provide the most detailed insights into your financial life, helping you secure better loans and rates.</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                 {[
                    { icon: ShieldCheck, title: "100% Secure", desc: "Your data is encrypted with bank-grade security protocols." },
                    { icon: Clock, title: "Instant Report", desc: "Get your comprehensive credit report in less than 60 seconds." },
                    { icon: Award, title: "Zero Impact", desc: "Checking your own score is a soft enquiry and doesn't lower it." },
                    { icon: Activity, title: "Detailed Analysis", desc: "Understand factors affecting your score like utilization & history." },
                    { icon: Lock, title: "Privacy First", desc: "We never share your personal data with third-party spammers." },
                    { icon: TrendingUp, title: "Improvement Tips", desc: "Get AI-driven personalized tips to boost your credit score." },
                 ].map((item, i) => (
                    <div key={i} className="p-8 rounded-2xl border border-slate-100 hover:border-brand-100 hover:shadow-xl hover:shadow-brand-500/5 transition-all group">
                       <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-brand-500 group-hover:text-white transition-colors text-brand-600">
                          <item.icon size={28} />
                       </div>
                       <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                       <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                    </div>
                 ))}
              </div>
           </div>
        </section>

        {/* How It Works */}
        <section className="py-24 px-6 bg-slate-900 text-white">
           <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row gap-16 items-center">
                 <div className="md:w-1/2">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">Get Your Score in 3 Simple Steps</h2>
                    <p className="text-slate-400 text-lg mb-10">No complex paperwork. No hidden charges. Just a seamless digital experience.</p>
                    
                    <div className="space-y-8">
                       {[
                          { step: "01", title: "Enter Basic Details", desc: "Provide your name, PAN, and mobile number to verify identity." },
                          { step: "02", title: "Select Bureaus", desc: "Choose from CIBIL, Experian, Equifax, or CRIF based on your needs." },
                          { step: "03", title: "View Report", desc: "Instantly access your detailed credit report and score analysis." }
                       ].map((s) => (
                          <div key={s.step} className="flex gap-6">
                             <div className="text-4xl font-black text-brand-500/20">{s.step}</div>
                             <div>
                                <h4 className="text-xl font-bold mb-2">{s.title}</h4>
                                <p className="text-slate-400">{s.desc}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                    <div className="mt-12">
                       <Button onClick={() => setStep('form')} className="px-8 py-3 bg-white text-slate-900 hover:bg-slate-200">Start Now</Button>
                    </div>
                 </div>
                 <div className="md:w-1/2 relative">
                    <div className="absolute inset-0 bg-brand-500/30 blur-[100px] rounded-full"></div>
                    <img 
                       src="https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=1000" 
                       alt="App Dashboard" 
                       className="relative rounded-2xl shadow-2xl border border-white/10"
                    />
                 </div>
              </div>
           </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 px-6 bg-slate-50">
           <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Frequently Asked Questions</h2>
              <div className="space-y-4">
                 {[
                    { q: "Will checking my score lower it?", a: "No. When you check your own credit score, it is considered a 'Soft Inquiry' which has zero impact on your credit score." },
                    { q: "How often is the data updated?", a: "Banks typically report data to bureaus every 30-45 days. We fetch the absolute latest data available at the moment of your request." },
                    { q: "Why are scores different across bureaus?", a: "Each bureau (CIBIL, Experian, etc.) has its own proprietary algorithm and may receive data from lenders at slightly different times." },
                    { q: "Is this service free?", a: "We offer basic insights for free, but detailed bureau reports require a nominal fee paid directly to the bureau partners via our platform." }
                 ].map((faq, idx) => (
                    <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                       <button 
                          onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                          className="w-full flex justify-between items-center p-5 text-left font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                       >
                          {faq.q}
                          {openFaq === idx ? <ChevronUp size={20} className="text-brand-600"/> : <ChevronDown size={20} className="text-slate-400"/>}
                       </button>
                       {openFaq === idx && (
                          <div className="px-5 pb-5 text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                             {faq.a}
                          </div>
                       )}
                    </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-12 px-6">
           <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-slate-900 font-bold text-xl">Credi<span className="text-brand-600">Check</span></div>
              <div className="text-slate-500 text-sm text-center md:text-right">
                 © 2024 CrediCheck AI. All rights reserved.<br/>
                 Licensed Partner of TransUnion CIBIL, Experian India, Equifax, and CRIF High Mark.
              </div>
           </div>
        </footer>

      </div>
    );
  }

  // Registration Form
  if (step === 'form') {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center font-sans">
        <Card className="w-full max-w-2xl shadow-xl border-0">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900">Enter Your Details</h2>
            <p className="text-slate-500">We need this to fetch your credit history accurately.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Full Name" name="fullName" value={formData.fullName} onChange={handleInputChange} required placeholder="As per PAN card" />
              <Input label="PAN Number" name="pan" value={formData.pan} onChange={handleInputChange} required placeholder="ABCDE1234F" maxLength={10} className="uppercase" />
              <Input label="Mobile Number" name="mobile" type="tel" value={formData.mobile} onChange={handleInputChange} required placeholder="9876543210" maxLength={10} />
              <Input label="Email Address" name="email" type="email" value={formData.email} onChange={handleInputChange} required placeholder="you@example.com" />
              <Input label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleInputChange} required />
              <Input label="Current Address" name="address" value={formData.address} onChange={handleInputChange} required placeholder="City, State" />
            </div>
            
            <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <input 
                type="checkbox" 
                name="consent" 
                id="consent"
                checked={formData.consent}
                onChange={handleInputChange}
                className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
              />
              <label htmlFor="consent" className="text-sm text-slate-700">
                I authorize CrediCheck to access my credit information from credit bureaus.
              </label>
            </div>

            {error && <div className="text-red-600 text-sm text-center font-medium bg-red-50 p-2 rounded">{error}</div>}

            <div className="flex justify-between items-center pt-4">
              <button type="button" onClick={() => setStep('landing')} className="text-slate-500 hover:text-slate-800 font-medium">Cancel</button>
              <Button type="submit" isLoading={loading} className="px-8 py-3 text-lg shadow-lg shadow-brand-200">
                Proceed
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // Payment Selection
  if (step === 'payment') {
    if(!pricing) return <div className="p-8 text-center">Loading Pricing...</div>;

    const total = calculateTotal();

    return (
       <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12 font-sans">
        <Card className="w-full max-w-lg shadow-xl border-0">
          <div className="text-center mb-8">
             <div className="inline-block p-3 bg-green-100 rounded-full mb-4">
               <CreditCard className="text-green-600" size={32} />
             </div>
             <h2 className="text-2xl font-bold text-slate-900">Select Reports</h2>
             <p className="text-slate-500">Choose bureaus to fetch your official credit report.</p>
          </div>

          <div className="space-y-3 mb-8">
            {['CIBIL', 'EXPERIAN', 'EQUIFAX', 'CRIF'].map((b) => {
              const isSelected = selectedBureaus.includes(b as Bureau);
              return (
                <div 
                  key={b}
                  onClick={() => toggleBureau(b as Bureau)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-brand-500 bg-brand-50 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
                >
                   <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-brand-500 border-brand-500' : 'border-slate-300 bg-white'}`}>
                        {isSelected && <Check size={14} className="text-white"/>}
                      </div>
                      <span className="font-bold text-slate-800">{b} Report</span>
                   </div>
                   <span className="font-medium text-slate-600">₹{pricing.USER[b as Bureau]}</span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-6 mb-6">
             <div className="flex justify-between items-center mb-2">
                <span className="text-slate-500">Selected Reports</span>
                <span className="font-semibold">{selectedBureaus.length}</span>
             </div>
             <div className="flex justify-between items-center text-lg">
                <span className="font-bold text-slate-800">Total Amount</span>
                <span className="font-bold text-brand-600 text-2xl">₹{total}</span>
             </div>
          </div>

          <Button 
            onClick={handlePayment} 
            isLoading={loading} 
            className="w-full py-4 text-lg shadow-lg shadow-brand-200"
            disabled={selectedBureaus.length === 0}
          >
            Pay ₹{total} & View Report
          </Button>
          <p className="text-center text-xs text-slate-400 mt-4">Secured by Mock Payment Gateway</p>
        </Card>
       </div>
    );
  }

  // Processing View
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 font-sans">
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Activity className="text-brand-500" size={40} />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Analyzing Financial Data</h2>
      <p className="text-slate-500 animate-pulse text-center">Contacting Bureaus & Generating Score...</p>
    </div>
  );
};
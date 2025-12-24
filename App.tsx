import React, { useState, useEffect } from 'react';
import { View, User, UserRole } from './types';
import { UserFlow } from './pages/UserFlow';
import { UserDashboard } from './pages/UserDashboard';
import { PartnerDashboard } from './pages/PartnerDashboard';
import { AdminPanel } from './pages/AdminPanel';
import { Button, Input, Card } from './components/ui';
import * as API from './services/api';

// Unified Login Component
const UnifiedLogin: React.FC<{ onSuccess: (user: User) => void, onBack: () => void }> = ({ onSuccess, onBack }) => {
  const [identifier, setIdentifier] = useState('');
  const [passOrOtp, setPassOrOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const user = await API.unifiedLogin(identifier, passOrOtp);
    setLoading(false);
    
    if (user) {
      onSuccess(user);
    } else {
      setError('Invalid credentials. Use email/password for Admins/Partners or mobile/OTP for Users.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm bg-white">
        <h2 className="text-2xl font-bold mb-6 text-center text-slate-900">CrediCheck Login</h2>
        <form onSubmit={handleLogin}>
          <Input 
             label="Email or Mobile" 
             value={identifier} 
             onChange={e => setIdentifier(e.target.value)} 
             placeholder="user@example.com or 9876543210" 
          />
          <Input 
             label="Password or OTP" 
             type="password" 
             value={passOrOtp} 
             onChange={e => setPassOrOtp(e.target.value)} 
             placeholder="Enter password or OTP" 
          />
          <p className="text-xs text-slate-500 mb-4">Use OTP '1234' for mobile users. 'admin123' / 'partner123' for staff.</p>
          
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          
          <Button type="submit" isLoading={loading} className="w-full mb-4">Secure Login</Button>
          <button type="button" onClick={onBack} className="w-full text-center text-sm text-slate-500 hover:text-slate-800">Back to Home</button>
        </form>
      </Card>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<View>('HOME');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Check session on load
    const user = API.getCurrentUser();
    if (user) {
       handleRoleRouting(user);
    }
  }, []);

  const handleRoleRouting = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'MASTER_ADMIN') setView('ADMIN_PANEL');
    else if (user.role === 'PARTNER_ADMIN') setView('PARTNER_DASHBOARD');
    else setView('USER_DASHBOARD');
  };

  const handleLogout = () => {
    API.logout();
    setCurrentUser(null);
    setView('HOME');
  };

  // View Router
  switch (view) {
    case 'LOGIN':
      return <UnifiedLogin onSuccess={handleRoleRouting} onBack={() => setView('HOME')} />;
    
    case 'ADMIN_PANEL':
      return currentUser?.role === 'MASTER_ADMIN' ? (
        <AdminPanel onLogout={handleLogout} />
      ) : <UnifiedLogin onSuccess={handleRoleRouting} onBack={() => setView('HOME')} />;

    case 'PARTNER_DASHBOARD':
      return currentUser && (currentUser.role === 'PARTNER_ADMIN' || currentUser.role === 'MASTER_ADMIN') ? (
         <PartnerDashboard user={currentUser} onLogout={handleLogout} navigate={setView} />
      ) : <UnifiedLogin onSuccess={handleRoleRouting} onBack={() => setView('HOME')} />;

    case 'USER_DASHBOARD':
      return currentUser ? (
        <UserDashboard user={currentUser} onLogout={handleLogout} />
      ) : (
        <div className="flex h-screen items-center justify-center flex-col gap-4">
          <p>Session Expired or Payment Required</p>
          <Button onClick={() => setView('HOME')}>Go Home</Button>
        </div>
      );

    case 'HOME':
    case 'FORM':
    default:
      return <UserFlow navigate={setView} onUserLogin={setCurrentUser} />;
  }
}

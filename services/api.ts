import { User, CreditReport, AdminStats, UserRole, Transaction, Bureau, PricingConfig } from '../types';
import { generateSingleBureauReport } from './scoreEngine';

// --- MOCK DATABASE (LocalStorage) ---

const STORAGE_KEYS = {
  USERS: 'credi_users',
  REPORTS: 'credi_reports',
  TXNS: 'credi_txns',
  SESSION: 'credi_session',
  PRICING: 'credi_pricing'
};

const getStorage = <T>(key: string, defaultVal: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultVal;
};

const setStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Seed Master Admin if not exists
const seedData = () => {
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    if (!users.find(u => u.role === 'MASTER_ADMIN')) {
        users.push({
            id: 'admin-001',
            fullName: 'Master Admin',
            email: 'admin@credicheck.com',
            mobile: '0000000000',
            pan: 'ADMIN0000X',
            role: 'MASTER_ADMIN',
            password: 'admin',
            createdAt: new Date().toISOString(),
            dob: '1990-01-01',
            address: ['HQ'],
            gender: 'Male',
            idType: 'PAN',
            idNumber: 'ADMIN0000X',
            occupation: 'Admin',
            income: 'N/A'
        });
        setStorage(STORAGE_KEYS.USERS, users);
    }
    // Seed Default Pricing
    if (!localStorage.getItem(STORAGE_KEYS.PRICING)) {
        setStorage(STORAGE_KEYS.PRICING, {
            USER: { CIBIL: 99, EXPERIAN: 99, EQUIFAX: 99, CRIF: 99 },
            PARTNER: { CIBIL: 49, EXPERIAN: 49, EQUIFAX: 49, CRIF: 49 }
        });
    }
};
seedData();

// --- API SERVICES ---

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Auth & User
export const registerUser = async (userData: any): Promise<User> => {
  await delay(800);
  const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
  
  // Check duplicates
  const existing = users.find(u => u.mobile === userData.mobile || u.pan === userData.pan);
  if (existing) {
      if(userData.role === 'PARTNER_ADMIN' || !existing.role) throw new Error("User already exists");
      return existing; // Return existing for normal flow
  }

  // Normalize Address to Array
  let addressArr: string[] = [];
  if (Array.isArray(userData.address)) {
      addressArr = userData.address;
  } else if (typeof userData.address === 'string' && userData.address.trim() !== '') {
      addressArr = [userData.address];
  } else {
      addressArr = ['Address Not Provided'];
  }

  const newUser: User = {
    ...userData,
    id: 'USR-' + Date.now(),
    role: userData.role || 'USER',
    createdAt: new Date().toISOString(),
    walletBalance: userData.role === 'PARTNER_ADMIN' ? 0 : undefined,
    address: addressArr,
    gender: userData.gender || 'Unknown',
    idType: userData.idType || 'PAN',
    idNumber: userData.idNumber || userData.pan || 'N/A',
    occupation: userData.occupation || 'Salaried',
    income: userData.income || '5-10 Lakhs'
  };
  
  users.push(newUser);
  setStorage(STORAGE_KEYS.USERS, users);
  
  if(!userData.role || userData.role === 'USER') {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(newUser));
  }
  return newUser;
};

export const createPartner = async (partnerData: any): Promise<User> => {
    return registerUser({ 
        ...partnerData, 
        role: 'PARTNER_ADMIN', 
        franchiseId: 'FR-' + Math.floor(1000 + Math.random() * 9000),
        walletBalance: 0 
    });
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<void> => {
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
        users[idx] = { ...users[idx], ...updates };
        setStorage(STORAGE_KEYS.USERS, users);
        
        // Update session if self
        const currentUser = getCurrentUser();
        if(currentUser?.id === userId) {
            localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(users[idx]));
        }
    }
};

export const deleteUser = async (userId: string): Promise<void> => {
    let users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    users = users.filter(u => u.id !== userId);
    setStorage(STORAGE_KEYS.USERS, users);
};

export const verifyOtp = async (mobile: string, otp: string): Promise<boolean> => {
  await delay(1000);
  return otp === '1234';
};

export const unifiedLogin = async (identifier: string, passOrOtp: string): Promise<User | null> => {
    await delay(800);
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    const user = users.find(u => u.email === identifier || u.mobile === identifier);
    
    if (!user) return null;

    if (user.role !== 'USER') {
        if (user.password === passOrOtp) {
            localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
            return user;
        }
        if (passOrOtp === 'admin123' && user.role === 'MASTER_ADMIN') {
             localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
             return user;
        }
        return null;
    } 
    
    if (passOrOtp === '1234') {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
        return user;
    }

    return null;
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEYS.SESSION);
  return data ? JSON.parse(data) : null;
};

// Wallet & Payments
export const loadWalletFunds = async (userId: string, amount: number): Promise<boolean> => {
    await delay(1000);
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    const idx = users.findIndex(u => u.id === userId);
    if(idx > -1) {
        users[idx].walletBalance = (users[idx].walletBalance || 0) + amount;
        setStorage(STORAGE_KEYS.USERS, users);
        
        // Log Transaction
        const txns = getStorage<Transaction[]>(STORAGE_KEYS.TXNS, []);
        txns.unshift({
            id: 'TXN-W-' + Date.now(),
            userId,
            amount,
            bureaus: [],
            date: new Date().toISOString(),
            status: 'SUCCESS',
            paymentMethod: 'GATEWAY',
            type: 'WALLET_TOPUP',
            description: 'Wallet Recharge via Gateway'
        });
        setStorage(STORAGE_KEYS.TXNS, txns);
        
        const current = getCurrentUser();
        if(current?.id === userId) {
            localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(users[idx]));
        }
        return true;
    }
    return false;
};

export const adjustPartnerWallet = async (partnerId: string, amount: number, type: 'CREDIT' | 'DEBIT', description: string): Promise<void> => {
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    const idx = users.findIndex(u => u.id === partnerId);
    if (idx === -1) throw new Error("Partner not found");

    const currentBal = users[idx].walletBalance || 0;
    const newBal = type === 'CREDIT' ? currentBal + amount : currentBal - amount;
    
    users[idx].walletBalance = newBal;
    setStorage(STORAGE_KEYS.USERS, users);

    const txns = getStorage<Transaction[]>(STORAGE_KEYS.TXNS, []);
    txns.unshift({
        id: 'TXN-ADJ-' + Date.now(),
        userId: partnerId,
        amount,
        bureaus: [],
        date: new Date().toISOString(),
        status: 'SUCCESS',
        paymentMethod: 'ADMIN_ADJUSTMENT',
        type: 'ADMIN_ADJUSTMENT',
        description: `${type}: ${description}`
    });
    setStorage(STORAGE_KEYS.TXNS, txns);
};

export const processPayment = async (
  userId: string, 
  bureaus: Bureau[], 
  totalAmount: number, 
  method: 'GATEWAY' | 'WALLET' | 'ADMIN_ADJUSTMENT',
  type: 'INITIAL' | 'REFRESH' | 'ADMIN_ADJUSTMENT'
): Promise<string | null> => {
  await delay(1500);
  
  if (method === 'WALLET') {
      const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
      const userIdx = users.findIndex(u => u.id === userId);
      if(userIdx > -1) {
          if ((users[userIdx].walletBalance || 0) < totalAmount) {
              return null; // Insufficient funds
          }
          users[userIdx].walletBalance = (users[userIdx].walletBalance || 0) - totalAmount;
          setStorage(STORAGE_KEYS.USERS, users);
          
          const current = getCurrentUser();
          if(current?.id === userId) {
             localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(users[userIdx]));
          }
      }
  }

  const txnId = 'TXN-' + Date.now();
  const txns = getStorage<Transaction[]>(STORAGE_KEYS.TXNS, []);
  txns.unshift({
      id: txnId,
      userId,
      amount: totalAmount,
      bureaus,
      date: new Date().toISOString(),
      status: 'SUCCESS',
      paymentMethod: method,
      type
  });
  setStorage(STORAGE_KEYS.TXNS, txns);
  return txnId;
};

export const getTransactions = async (role: UserRole, userId?: string): Promise<Transaction[]> => {
    const txns = getStorage<Transaction[]>(STORAGE_KEYS.TXNS, []);
    if (userId) {
        return txns.filter(t => t.userId === userId);
    }
    return txns;
};

// --- SINGLE BACKEND ENDPOINT SIMULATION ---
// Generates a Single Report for a Specific Bureau
const generateSingleReportInternal = async (
    customerId: string, 
    generatorId: string, 
    bureau: Bureau, 
    txnId: string,
    isRefresh: boolean
): Promise<CreditReport> => {
    await delay(1000); // Simulate API call latency
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    const user = users.find(u => u.id === customerId);
    if (!user) throw new Error("User not found");

    const report = generateSingleBureauReport(
        user, 
        generatorId, 
        bureau, 
        txnId, 
        isRefresh ? 2 : 1
    );
    
    const reports = getStorage<CreditReport[]>(STORAGE_KEYS.REPORTS, []);
    reports.unshift(report);
    setStorage(STORAGE_KEYS.REPORTS, reports);
    
    return report;
};

// Batch Wrapper to simulate user requesting multiple bureaus
export const generateReportsBatch = async (
    customerId: string, 
    generatorId: string | undefined, 
    bureaus: Bureau[], 
    paymentType: 'INITIAL' | 'REFRESH', 
    transactionId: string
): Promise<CreditReport[]> => {
    const results: CreditReport[] = [];
    for (const bureau of bureaus) {
        const report = await generateSingleReportInternal(
            customerId, 
            generatorId || customerId, 
            bureau, 
            transactionId, 
            paymentType === 'REFRESH'
        );
        results.push(report);
    }
    return results;
};

export const getUserLatestReports = async (userId: string): Promise<CreditReport[]> => {
  const reports = getStorage<CreditReport[]>(STORAGE_KEYS.REPORTS, []);
  // Return all reports for the user, logic in UI can group them
  return reports.filter(r => r.userId === userId);
};

export const getAllUsers = async (): Promise<User[]> => {
  return getStorage<User[]>(STORAGE_KEYS.USERS, []);
};

export const getAllReports = async (): Promise<(CreditReport & { customerName: string, generatorName: string, partnerFranchiseId?: string })[]> => {
    const reports = getStorage<CreditReport[]>(STORAGE_KEYS.REPORTS, []);
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    
    return reports.map(r => {
        const customer = users.find(u => u.id === r.userId);
        const generator = users.find(u => u.id === r.generatedBy);
        // Fallback for customerName if consumer.name is missing (should not happen in new reports)
        const name = r.consumer?.name || customer?.fullName || 'Unknown';
        
        return {
            ...r,
            customerName: name,
            generatorName: generator?.fullName || 'Self',
            partnerFranchiseId: generator?.role === 'PARTNER_ADMIN' ? generator.franchiseId : undefined
        };
    });
};

export const getPartnerReports = async (partnerId: string): Promise<(CreditReport & { customerName: string, transactionAmount?: number })[]> => {
    const reports = getStorage<CreditReport[]>(STORAGE_KEYS.REPORTS, []);
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    const txns = getStorage<Transaction[]>(STORAGE_KEYS.TXNS, []);

    return reports
        .filter(r => r.generatedBy === partnerId)
        .map(r => {
            const customer = users.find(u => u.id === r.userId);
            // Approximate txn mapping
            const txn = txns.find(t => t.id === r.transactionId);
            return {
                ...r,
                customerName: r.consumer?.name || customer?.fullName || 'Unknown',
                transactionAmount: txn?.amount // This is total transaction amount, strictly not per report cost, but okay for mock
            }
        });
};

export const updateUserRole = async (targetUserId: string, newRole: UserRole): Promise<void> => {
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    const idx = users.findIndex(u => u.id === targetUserId);
    if(idx > -1) {
        users[idx].role = newRole;
        if(newRole === 'PARTNER_ADMIN' && !users[idx].franchiseId) {
            users[idx].franchiseId = 'FR-' + Math.floor(1000 + Math.random() * 9000);
            users[idx].walletBalance = 0;
            users[idx].password = 'partner123';
        }
        setStorage(STORAGE_KEYS.USERS, users);
    }
};

export const getAdminStats = async (): Promise<AdminStats> => {
  const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
  const reports = getStorage<CreditReport[]>(STORAGE_KEYS.REPORTS, []);
  const txns = getStorage<Transaction[]>(STORAGE_KEYS.TXNS, []);

  const revenue = txns.reduce((acc, t) => acc + t.amount, 0);
  
  let totalScore = 0;
  reports.forEach(r => totalScore += r.score);

  return {
    totalUsers: users.length,
    totalReports: reports.length,
    totalRevenue: revenue,
    avgScore: reports.length ? Math.floor(totalScore / reports.length) : 0,
    highRiskCount: reports.filter(r => r.riskLevel === 'HIGH').length,
    loanDistribution: [
       { name: 'Personal', value: 400 },
       { name: 'Home', value: 300 },
       { name: 'Auto', value: 300 },
       { name: 'Credit Card', value: 200 }
    ]
  };
};

export const getPartnerStats = async (partnerId: string) => {
    const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
    const reports = getStorage<CreditReport[]>(STORAGE_KEYS.REPORTS, []);
    
    const partner = users.find(u => u.id === partnerId);
    const partnerReports = reports.filter(r => r.generatedBy === partnerId);

    return {
        walletBalance: partner?.walletBalance || 0,
        reportsSold: partnerReports.length
    }
};

// --- PRICING CONFIG ---
export const getPricing = async (): Promise<PricingConfig> => {
    return getStorage<PricingConfig>(STORAGE_KEYS.PRICING, {
        USER: { CIBIL: 99, EXPERIAN: 99, EQUIFAX: 99, CRIF: 99 },
        PARTNER: { CIBIL: 99, EXPERIAN: 99, EQUIFAX: 99, CRIF: 99 }
    });
}

export const updatePricing = async (config: PricingConfig): Promise<void> => {
    setStorage(STORAGE_KEYS.PRICING, config);
}
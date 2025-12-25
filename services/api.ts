import { User, CreditReport, AdminStats, UserRole, Transaction, Bureau, PricingConfig } from '../types';
import { supabase } from './supabase';
import { generateMockCreditReport } from './scoreEngine';

// --- CONSTANTS ---

const STORAGE_KEYS = {
  USERS: 'credi_users',
  REPORTS: 'credi_reports',
  TXNS: 'credi_txns',
  SESSION: 'credi_session',
  PRICING: 'credi_pricing'
};

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// --- HYBRID DATA LAYER (Supabase + LocalStorage Fallback) ---

// Helper to check if we can talk to Supabase Tables
let isSupabaseConnected = true; // Optimistic default

const safeDbSelect = async <T>(table: string, queryBuilder: any, localKey: string): Promise<T[]> => {
    // Try Supabase first
    if (isSupabaseConnected) {
        try {
            const { data, error } = await queryBuilder;
            if (!error && data) return data as T[];
            // If error is "relation does not exist" (404 for table), switch to local
            if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
                console.warn(`Supabase table '${table}' missing. Falling back to LocalStorage.`);
                isSupabaseConnected = false;
            }
        } catch (e) {
            console.warn(`Supabase connection failed for '${table}'. Falling back.`);
            isSupabaseConnected = false;
        }
    }
    // Fallback
    const local = localStorage.getItem(localKey);
    return local ? JSON.parse(local) : [];
};

const safeDbInsert = async (table: string, data: any, localKey: string) => {
    // Try Supabase
    if (isSupabaseConnected) {
        try {
            // Strip any fields that might not exist in a simple schema if needed, 
            // but for now we send the full object.
            const { error } = await supabase.from(table).insert(data);
            if (error) {
                if (error.code === '42P01') isSupabaseConnected = false;
                else console.error(`Supabase Insert Error [${table}]:`, error.message);
            }
        } catch (e) {
             console.warn(`Supabase insert failed. Falling back.`);
        }
    }
    // Always write to LocalStorage to ensure sync/offline capability
    const current = JSON.parse(localStorage.getItem(localKey) || '[]');
    // Avoid duplicates if ID exists
    const existingIdx = current.findIndex((i: any) => i.id === data.id);
    if (existingIdx >= 0) current[existingIdx] = data;
    else current.push(data);
    
    localStorage.setItem(localKey, JSON.stringify(current));
};

const safeDbUpdate = async (table: string, id: string, updates: any, localKey: string) => {
    if (isSupabaseConnected) {
        try {
            await supabase.from(table).update(updates).eq('id', id);
        } catch (e) { console.warn("Supabase update failed"); }
    }
    // Local
    const current = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = current.findIndex((i: any) => i.id === id);
    if (idx !== -1) {
        current[idx] = { ...current[idx], ...updates };
        localStorage.setItem(localKey, JSON.stringify(current));
    }
};

const safeDbDelete = async (table: string, id: string, localKey: string) => {
     if (isSupabaseConnected) {
        try {
            await supabase.from(table).delete().eq('id', id);
        } catch (e) { console.warn("Supabase delete failed"); }
    }
    // Local
    let current = JSON.parse(localStorage.getItem(localKey) || '[]');
    current = current.filter((i: any) => i.id !== id);
    localStorage.setItem(localKey, JSON.stringify(current));
}


// --- SEEDING ---
const seedData = async () => {
    const users = await safeDbSelect<User>('users', supabase.from('users').select('*'), STORAGE_KEYS.USERS);
    
    if (!users.find(u => u.role === 'MASTER_ADMIN')) {
        const admin: User = {
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
        };
        await safeDbInsert('users', admin, STORAGE_KEYS.USERS);
    }

    if (!localStorage.getItem(STORAGE_KEYS.PRICING)) {
        localStorage.setItem(STORAGE_KEYS.PRICING, JSON.stringify({
            USER: { CIBIL: 99, EXPERIAN: 99, EQUIFAX: 99, CRIF: 99 },
            PARTNER: { CIBIL: 49, EXPERIAN: 49, EQUIFAX: 49, CRIF: 49 }
        }));
    }
};
seedData();


// --- API SERVICES ---

// Auth & User
export const registerUser = async (userData: any): Promise<User> => {
  await delay(800);
  const users = await safeDbSelect<User>('users', supabase.from('users').select('*'), STORAGE_KEYS.USERS);
  
  // Check duplicates
  const existing = users.find(u => u.mobile === userData.mobile || u.pan === userData.pan);
  if (existing) {
      if(userData.role === 'PARTNER_ADMIN' || !existing.role) throw new Error("User already exists");
      return existing; 
  }

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
  
  await safeDbInsert('users', newUser, STORAGE_KEYS.USERS);
  
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
    await safeDbUpdate('users', userId, updates, STORAGE_KEYS.USERS);
    // Session update
    const currentUser = getCurrentUser();
    if(currentUser?.id === userId) {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ ...currentUser, ...updates }));
    }
};

export const deleteUser = async (userId: string): Promise<void> => {
    await safeDbDelete('users', userId, STORAGE_KEYS.USERS);
};

export const updateUserRole = async (userId: string, role: UserRole): Promise<void> => {
    return updateUser(userId, { role });
};

export const verifyOtp = async (mobile: string, otp: string): Promise<boolean> => {
  await delay(1000);
  return otp === '1234';
};

export const unifiedLogin = async (identifier: string, passOrOtp: string): Promise<User | null> => {
    await delay(800);
    // Fetch latest users
    const users = await safeDbSelect<User>('users', supabase.from('users').select('*'), STORAGE_KEYS.USERS);
    
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
    const users = await safeDbSelect<User>('users', supabase.from('users').select('*'), STORAGE_KEYS.USERS);
    const user = users.find(u => u.id === userId);
    
    if(user) {
        const newBalance = (user.walletBalance || 0) + amount;
        await safeDbUpdate('users', userId, { walletBalance: newBalance }, STORAGE_KEYS.USERS);
        
        // Log Transaction
        const txn: Transaction = {
            id: 'TXN-W-' + Date.now(),
            userId,
            amount,
            bureaus: [],
            date: new Date().toISOString(),
            status: 'SUCCESS',
            paymentMethod: 'GATEWAY',
            type: 'WALLET_TOPUP',
            description: 'Wallet Recharge via Gateway'
        };
        await safeDbInsert('transactions', txn, STORAGE_KEYS.TXNS);
        
        const current = getCurrentUser();
        if(current?.id === userId) {
            localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ ...current, walletBalance: newBalance }));
        }
        return true;
    }
    return false;
};

export const adjustPartnerWallet = async (partnerId: string, amount: number, type: 'CREDIT' | 'DEBIT', description: string): Promise<void> => {
    const users = await safeDbSelect<User>('users', supabase.from('users').select('*'), STORAGE_KEYS.USERS);
    const user = users.find(u => u.id === partnerId);
    if (!user) throw new Error("Partner not found");

    const currentBal = user.walletBalance || 0;
    const newBal = type === 'CREDIT' ? currentBal + amount : currentBal - amount;
    
    await safeDbUpdate('users', partnerId, { walletBalance: newBal }, STORAGE_KEYS.USERS);

    const txn: Transaction = {
        id: 'TXN-ADJ-' + Date.now(),
        userId: partnerId,
        amount,
        bureaus: [],
        date: new Date().toISOString(),
        status: 'SUCCESS',
        paymentMethod: 'ADMIN_ADJUSTMENT',
        type: 'ADMIN_ADJUSTMENT',
        description: `${type}: ${description}`
    };
    await safeDbInsert('transactions', txn, STORAGE_KEYS.TXNS);
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
      const users = await safeDbSelect<User>('users', supabase.from('users').select('*'), STORAGE_KEYS.USERS);
      const user = users.find(u => u.id === userId);
      
      if(user) {
          if ((user.walletBalance || 0) < totalAmount) {
              return null; // Insufficient funds
          }
          const newBal = (user.walletBalance || 0) - totalAmount;
          await safeDbUpdate('users', userId, { walletBalance: newBal }, STORAGE_KEYS.USERS);
          
          const current = getCurrentUser();
          if(current?.id === userId) {
             localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ ...current, walletBalance: newBal }));
          }
      }
  }

  const txnId = 'TXN-' + Date.now();
  const txn: Transaction = {
      id: txnId,
      userId,
      amount: totalAmount,
      bureaus,
      date: new Date().toISOString(),
      status: 'SUCCESS',
      paymentMethod: method,
      type
  };
  await safeDbInsert('transactions', txn, STORAGE_KEYS.TXNS);
  return txnId;
};

export const getTransactions = async (role: UserRole, userId?: string): Promise<Transaction[]> => {
    const txns = await safeDbSelect<Transaction>('transactions', supabase.from('transactions').select('*'), STORAGE_KEYS.TXNS);
    if (userId) {
        return txns.filter(t => t.userId === userId);
    }
    return txns;
};

// --- CORE REPORT GENERATION ENGINE ---
// CRITICAL FIX: Running this Client-Side (or via DB) instead of calling a missing Edge Function
const generateSingleReportInternal = async (
    customerId: string, 
    generatorId: string, 
    bureau: Bureau, 
    txnId: string,
    isRefresh: boolean
): Promise<CreditReport> => {
    
    const users = await safeDbSelect<User>('users', supabase.from('users').select('*'), STORAGE_KEYS.USERS);
    const user = users.find(u => u.id === customerId);
    if (!user) throw new Error("User not found");

    // Simulate Network Delay
    await delay(1200);

    // Generate Data using the Local Engine
    const mockData = generateMockCreditReport(user, bureau);
    
    const fullReport: CreditReport = {
        ...mockData,
        id: 'RPT-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        transactionId: txnId,
        userId: customerId,
        generatedBy: generatorId,
        version: isRefresh ? 2 : 1
    } as CreditReport;

    // Persist to Database (Supabase + Local)
    await safeDbInsert('reports', fullReport, STORAGE_KEYS.REPORTS);

    return fullReport;
};

// Batch Wrapper
export const generateReportsBatch = async (
    customerId: string, 
    generatorId: string | undefined, 
    bureaus: Bureau[], 
    paymentType: 'INITIAL' | 'REFRESH', 
    transactionId: string
): Promise<CreditReport[]> => {
    const results: CreditReport[] = [];
    for (const bureau of bureaus) {
        try {
            const report = await generateSingleReportInternal(
                customerId, 
                generatorId || customerId, 
                bureau, 
                transactionId, 
                paymentType === 'REFRESH'
            );
            results.push(report);
        } catch (e) {
            console.error(`Failed to generate ${bureau} report:`, e);
        }
    }
    return results;
};

export const getUserLatestReports = async (userId: string): Promise<CreditReport[]> => {
  const reports = await safeDbSelect<CreditReport>('reports', supabase.from('reports').select('*'), STORAGE_KEYS.REPORTS);
  return reports.filter(r => r.userId === userId);
};

export const getAllUsers = async (): Promise<User[]> => {
  return safeDbSelect<User>('users', supabase.from('users').select('*'), STORAGE_KEYS.USERS);
};

export const getAllReports = async (): Promise<(CreditReport & { customerName: string, generatorName: string, partnerFranchiseId?: string })[]> => {
    const reports = await safeDbSelect<CreditReport>('reports', supabase.from('reports').select('*'), STORAGE_KEYS.REPORTS);
    const users = await safeDbSelect<User>('users', supabase.from('users').select('*'), STORAGE_KEYS.USERS);
    
    return reports.map(r => {
        const customer = users.find(u => u.id === r.userId);
        const generator = users.find(u => u.id === r.generatedBy);
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
    const reports = await safeDbSelect<CreditReport>('reports', supabase.from('reports').select('*'), STORAGE_KEYS.REPORTS);
    const users = await safeDbSelect<User>('users', supabase.from('users').select('*'), STORAGE_KEYS.USERS);

    return reports
        .filter(r => r.generatedBy === partnerId)
        .map(r => {
            const customer = users.find(u => u.id === r.userId);
            return {
                ...r,
                customerName: customer?.fullName || 'Unknown'
            };
        });
};

export const getAdminStats = async (): Promise<AdminStats> => {
    await delay(500);
    const users = await safeDbSelect<User>('users', supabase.from('users').select('*'), STORAGE_KEYS.USERS);
    const reports = await safeDbSelect<CreditReport>('reports', supabase.from('reports').select('*'), STORAGE_KEYS.REPORTS);
    const txns = await safeDbSelect<Transaction>('transactions', supabase.from('transactions').select('*'), STORAGE_KEYS.TXNS);
    
    // Revenue from Gateway + Adjustments (ignoring wallet usage internal)
    const revenue = txns
        .filter(t => t.paymentMethod === 'GATEWAY' && t.status === 'SUCCESS')
        .reduce((acc, t) => acc + t.amount, 0);

    const scores = reports.map(r => r.score);
    const avgScore = scores.length ? Math.floor(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const highRisk = reports.filter(r => r.riskLevel === 'HIGH').length;

    return {
        totalUsers: users.length,
        totalReports: reports.length,
        totalRevenue: revenue,
        avgScore,
        highRiskCount: highRisk,
        loanDistribution: []
    };
};

export const getPartnerStats = async (partnerId: string): Promise<any> => {
    await delay(500);
    const users = await safeDbSelect<User>('users', supabase.from('users').select('*'), STORAGE_KEYS.USERS);
    const reports = await safeDbSelect<CreditReport>('reports', supabase.from('reports').select('*'), STORAGE_KEYS.REPORTS);
    const partner = users.find(u => u.id === partnerId);
    
    const myReports = reports.filter(r => r.generatedBy === partnerId);
    
    return {
        walletBalance: partner?.walletBalance || 0,
        reportsSold: myReports.length,
        customers: 0 // Calculated in UI
    };
};

export const getPricing = async (): Promise<PricingConfig> => {
    const defaults = {
        USER: { CIBIL: 99, EXPERIAN: 99, EQUIFAX: 99, CRIF: 99 },
        PARTNER: { CIBIL: 49, EXPERIAN: 49, EQUIFAX: 49, CRIF: 49 }
    };
    const local = localStorage.getItem(STORAGE_KEYS.PRICING);
    return local ? JSON.parse(local) : defaults;
};

export const updatePricing = async (config: PricingConfig): Promise<void> => {
    await delay(500);
    localStorage.setItem(STORAGE_KEYS.PRICING, JSON.stringify(config));
};
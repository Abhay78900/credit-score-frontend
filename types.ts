export type Bureau = 'CIBIL' | 'EXPERIAN' | 'EQUIFAX' | 'CRIF';

export enum ScoreCategory {
  POOR = 'Poor',
  AVERAGE = 'Average',
  GOOD = 'Good',
  EXCELLENT = 'Excellent'
}

export type UserRole = 'USER' | 'PARTNER_ADMIN' | 'MASTER_ADMIN';

export interface PaymentHistoryMonth {
  month: string;
  year: number;
  status: string; // "STD", "000", "XXX", "DBT", "LSS", "SMA" etc
  daysPastDue?: string; // "030", "060", etc.
  assetClassification?: string; // "STD", "SUB", "DBT", "LSS"
}

// Detailed Account Information matching CIBIL Format
export interface Loan {
  memberName: string; // Bank Name
  accountType: string; // PL, HL, CC, etc.
  accountNumber: string; // Masked
  ownership: string; // Individual, Joint, Guarantor
  
  // Dates
  dateOpened: string;
  dateLastPayment: string;
  dateReported: string;
  dateClosed?: string;
  
  // Amounts
  sanctionedAmount: number; // For Loans
  creditLimit?: number;     // For Credit Cards
  cashLimit?: number;       // For Credit Cards
  currentBalance: number;
  amountOverdue: number;
  
  // Terms
  rateOfInterest: string;
  repaymentTenure: number | string;
  emiAmount: number;
  paymentFrequency: string; // Monthly, Quarterly
  
  // Collateral / Status Details
  collateralType: string;
  collateralValue: number;
  
  // Expanded Status Details
  suitFiledStatus: string; // 'No Suit Filed' | 'Suit Filed'
  wilfulDefaultStatus?: string; // 'No' | 'Yes'
  
  writtenOffStatus: string; // 'Restructured' | 'Written Off' | 'Settled' | ''
  writtenOffAmountTotal?: number;
  writtenOffAmountPrincipal?: number;
  
  settlementAmount?: number;
  settlementDate?: string;
  
  paymentHistory: PaymentHistoryMonth[]; 
  status: 'Active' | 'Closed' | 'Settled' | 'Written Off';
  accountStatus?: string; // Raw status from bureau
}

export interface Enquiry {
  memberName: string;
  date: string;
  purpose: string;
  amount?: number;
}

// Sub-sections for Consumer
export interface BureauAddress {
  address: string;
  category: string; // Permanent, Residence, Office
  residenceCode?: string; // e.g., '01', '02'
  dateReported: string;
}

export interface BureauIdentification {
  type: string; // PAN, Passport, Voter ID, Driving License, UID
  number: string;
  issueDate?: string;
  expiryDate?: string;
}

export interface BureauContact {
  type: string; // Mobile, Home, Office, Email
  value: string;
}

export interface BureauEmployment {
  occupation: string;
  employerName?: string;
  income: string;
  netGrossIndicator: string; // Net / Gross
  frequency: string; // Monthly / Annual
  dateReported: string;
}

export interface User {
  id: string;
  fullName: string;
  pan: string;
  mobile: string;
  email: string;
  dob: string;
  gender: string;
  address: string[]; 
  occupation: string;
  income: string;
  idType: string;
  idNumber: string;
  role: UserRole;
  franchiseId?: string; // If partner
  referredBy?: string; // If user was referred
  walletBalance?: number; // For Partners
  password?: string; // For Admins/Partners
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  bureaus: Bureau[];
  date: string;
  status: 'SUCCESS' | 'FAILED';
  paymentMethod: 'GATEWAY' | 'WALLET' | 'ADMIN_ADJUSTMENT';
  type: 'INITIAL' | 'REFRESH' | 'WALLET_TOPUP' | 'ADMIN_ADJUSTMENT'; 
  reportVersion?: number;
  description?: string;
}

// STANDARD LOCKED RESPONSE FORMAT (Enhanced)
export interface CreditReport {
  id: string;
  bureau: Bureau;
  reportType?: string; // "Consumer Credit Report"
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  referenceId: string; // Control Number / Reference Number
  controlNumber: string; // Explicit Field
  
  // Score Info
  score: number;
  scoreBand: string; // POOR | FAIR | GOOD | EXCELLENT
  scoreRange?: string; // "300-900"
  scoreDescription?: string;
  scoreDate?: string;
  riskLevel: string; // LOW | MEDIUM | HIGH
  
  reportDate: string; // ISO date
  
  consumer: {
    name: string;
    dob: string;
    gender: string;
    pan: string;
    mobile: string;
    
    // Detailed Sections
    addresses: BureauAddress[];
    identifications: BureauIdentification[];
    contacts: BureauContact[];
    employments: BureauEmployment[];
  };
  
  accountsSummary: {
    totalLoans: number;
    activeLoans: number;
    closedLoans: number;
    overdueAccounts: number;
  };

  // Detailed Data (Kept for UI)
  loans: Loan[];
  enquiries: Enquiry[];
  
  // Disclaimer
  bureauRemarks?: string;
  legalDisclaimerText?: string;
  
  // System Metadata
  transactionId: string;
  userId: string;
  generatedBy: string;
  version: number;
}

export interface AdminStats {
  totalUsers: number;
  totalReports: number;
  totalRevenue: number;
  avgScore: number;
  highRiskCount: number;
  loanDistribution: { name: string; value: number }[];
}

export interface PricingConfig {
  USER: Record<Bureau, number>;
  PARTNER: Record<Bureau, number>;
}

// Navigation Types
export type View = 
  | 'HOME' 
  | 'LOGIN'
  | 'FORM' 
  | 'PAYMENT'
  | 'USER_DASHBOARD' 
  | 'PARTNER_DASHBOARD'
  | 'ADMIN_PANEL';
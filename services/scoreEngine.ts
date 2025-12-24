import { CreditReport, User, Bureau, Loan, PaymentHistoryMonth, Enquiry, BureauAddress, BureauContact, BureauIdentification, BureauEmployment } from '../types';

// Helper to generate random integer
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to generate random date within past years
const randomDate = (yearsBack: number) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - randomInt(0, yearsBack));
  date.setMonth(randomInt(0, 11));
  date.setDate(randomInt(1, 28));
  return date.toISOString().split('T')[0];
};

const generatePaymentHistory = (status: 'Clean' | 'Mixed' | 'Bad'): PaymentHistoryMonth[] => {
  const history: PaymentHistoryMonth[] = [];
  const currentYear = new Date().getFullYear();
  
  for (let i = 0; i < 24; i++) { // Last 24 months
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    
    let monthStatus = 'STD'; // Standard/Clean
    
    if (status === 'Bad' && Math.random() > 0.6) {
      monthStatus = ['SMA', 'SUB', 'DBT', '030', '060'][randomInt(0, 4)];
    } else if (status === 'Mixed' && Math.random() > 0.8) {
      monthStatus = ['030', 'SMA'][randomInt(0, 1)];
    }

    history.push({
      month: date.toLocaleString('default', { month: 'short' }).toUpperCase(),
      year: date.getFullYear(),
      status: monthStatus
    });
  }
  return history;
};

const generateLoans = (profile: 'High' | 'Med' | 'Low'): Loan[] => {
  const loans: Loan[] = [];
  const count = profile === 'High' ? randomInt(4, 8) : profile === 'Med' ? randomInt(2, 4) : randomInt(0, 2);

  const bankNames = ['HDFC Bank', 'SBI', 'ICICI Bank', 'Axis Bank', 'Bajaj Finserv', 'Kotak Mahindra'];
  const loanTypes = ['Personal Loan', 'Credit Card', 'Auto Loan', 'Home Loan', 'Consumer Durable'];

  for (let i = 0; i < count; i++) {
    const isClosed = Math.random() > 0.5;
    const type = loanTypes[randomInt(0, loanTypes.length - 1)];
    const sanction = randomInt(50000, 5000000);
    const balance = isClosed ? 0 : Math.floor(sanction * (Math.random() * 0.8));

    loans.push({
      memberName: bankNames[randomInt(0, bankNames.length - 1)],
      accountType: type,
      accountNumber: `XX${randomInt(1000, 9999)}XX`,
      ownership: 'Individual',
      dateOpened: randomDate(5),
      dateLastPayment: randomDate(0),
      dateReported: new Date().toISOString().split('T')[0],
      dateClosed: isClosed ? randomDate(2) : undefined,
      sanctionedAmount: type === 'Credit Card' ? 0 : sanction,
      creditLimit: type === 'Credit Card' ? sanction : undefined,
      cashLimit: type === 'Credit Card' ? Math.floor(sanction * 0.2) : undefined,
      currentBalance: balance,
      amountOverdue: (profile === 'Low' && !isClosed) ? randomInt(1000, 50000) : 0,
      rateOfInterest: `${randomInt(8, 16)}%`,
      repaymentTenure: `${randomInt(12, 240)} Months`,
      emiAmount: Math.floor(sanction / 36),
      paymentFrequency: 'Monthly',
      collateralType: type === 'Home Loan' ? 'Property' : 'None',
      collateralValue: type === 'Home Loan' ? Math.floor(sanction * 1.2) : 0,
      suitFiledStatus: 'No Suit Filed',
      writtenOffStatus: '',
      paymentHistory: generatePaymentHistory(profile === 'High' ? 'Clean' : profile === 'Med' ? 'Mixed' : 'Bad'),
      status: isClosed ? 'Closed' : 'Active'
    });
  }
  return loans;
};

export const generateMockCreditReport = (user: User, bureau: Bureau): Partial<CreditReport> => {
  // Deterministic randomness based on PAN to keep score consistent for same user
  const seed = user.pan.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const scoreBase = 300 + (seed % 600); // 300 to 900
  
  // Adjust based on "Risk Profile" logic
  let finalScore = scoreBase;
  let riskLevel = 'MEDIUM';
  let profile: 'High' | 'Med' | 'Low' = 'Med';

  if (finalScore > 750) {
      riskLevel = 'LOW';
      profile = 'High';
  } else if (finalScore < 600) {
      riskLevel = 'HIGH';
      profile = 'Low';
  }

  const loans = generateLoans(profile);
  const activeLoans = loans.filter(l => l.status === 'Active').length;
  const closedLoans = loans.filter(l => l.status === 'Closed').length;
  const overdueAccounts = loans.filter(l => l.amountOverdue > 0).length;

  const scoreBand = finalScore >= 750 ? 'EXCELLENT' : finalScore >= 650 ? 'GOOD' : finalScore >= 550 ? 'AVERAGE' : 'POOR';

  return {
    bureau: bureau,
    reportType: 'Consumer Credit Information Report',
    status: 'SUCCESS',
    controlNumber: `${bureau.substring(0,3)}-${Date.now()}-${randomInt(1000,9999)}`,
    score: finalScore,
    scoreBand: scoreBand,
    scoreRange: "300-900",
    scoreDescription: `Based on your credit history, your score is ${finalScore}. You are in the top ${randomInt(10, 50)}% of borrowers.`,
    riskLevel: riskLevel,
    reportDate: new Date().toISOString(),
    consumer: {
      name: user.fullName,
      dob: user.dob,
      gender: user.gender,
      pan: user.pan,
      mobile: user.mobile,
      addresses: user.address.map((addr, i) => ({
        address: addr,
        category: i === 0 ? 'Permanent' : 'Residence',
        dateReported: randomDate(1)
      })),
      identifications: [
        { type: 'PAN', number: user.pan, issueDate: randomDate(5) }
      ],
      contacts: [
        { type: 'Mobile', value: user.mobile },
        { type: 'Email', value: user.email }
      ],
      employments: [
        { 
          occupation: user.occupation, 
          income: user.income, 
          netGrossIndicator: 'Net', 
          frequency: 'Monthly', 
          dateReported: randomDate(1) 
        }
      ]
    },
    accountsSummary: {
      totalLoans: loans.length,
      activeLoans: activeLoans,
      closedLoans: closedLoans,
      overdueAccounts: overdueAccounts
    },
    loans: loans,
    enquiries: [
      { memberName: 'HDFC Bank', date: randomDate(0), purpose: 'Personal Loan', amount: 500000 },
      { memberName: 'Bajaj Finance', date: randomDate(1), purpose: 'Consumer Loan', amount: 25000 }
    ],
    bureauRemarks: "No adverse remarks found.",
    legalDisclaimerText: "This report is generated for simulation purposes only based on the CrediCheck Mock Engine."
  };
};
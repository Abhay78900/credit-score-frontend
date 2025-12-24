import { CreditReport, User, Bureau, Loan, Enquiry, PaymentHistoryMonth, BureauAddress, BureauIdentification, BureauContact, BureauEmployment } from '../types';

// Helper: Seeded Random to ensure same PAN gets same results initially
const getSeededRandom = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const x = Math.sin(hash) * 10000;
    return x - Math.floor(x);
};

const BANKS = ['HDFC Bank', 'SBI Cards', 'ICICI Bank', 'Axis Bank', 'Bajaj Finance', 'Kotak Mahindra', 'Citibank NA', 'American Express', 'Bank of Baroda', 'Punjab National Bank'];
const LOAN_TYPES = ['Personal Loan', 'Credit Card', 'Auto Loan', 'Housing Loan', 'Consumer Loan', 'Business Loan', 'Kisan Credit Card', 'Gold Loan'];
const EMPLOYERS = ['TCS', 'Infosys', 'Reliance Industries', 'Government of India', 'Self Employed', 'Adani Group', 'Wipro'];

const generatePaymentHistory = (startYear: number, months: number): PaymentHistoryMonth[] => {
    const history: PaymentHistoryMonth[] = [];
    const statuses = ['STD', 'STD', 'STD', 'STD', 'STD', 'STD', '000', 'STD', 'XXX', 'SMA', 'SUB']; 
    
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();

    for(let i=0; i<months; i++) {
        const status = Math.random() > 0.9 ? 'DBT' : statuses[Math.floor(Math.random() * statuses.length)];
        history.push({
            month: ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][currentMonth],
            year: currentYear,
            status: status,
            assetClassification: status === '000' || status === 'XXX' ? 'STD' : status,
            daysPastDue: status === 'STD' || status === '000' ? '0' : (Math.floor(Math.random() * 90) + 1).toString()
        });
        currentMonth--;
        if(currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
    }
    return history;
};

// Generates a SINGLE report for a specific Bureau
export const generateSingleBureauReport = (
    user: User, 
    generatorId: string, 
    bureau: Bureau, 
    transactionId: string,
    version: number = 1
): CreditReport => {
    
    const seed = user.pan + bureau + version;
    const rng = getSeededRandom(seed);
    const now = new Date();
    
    // 1. Generate Score
    const baseScore = 650 + Math.floor(rng * 200); // 650 - 850 range
    // Slight variation per bureau simulated by using bureau name in seed
    const variance = Math.floor(Math.random() * 20) - 10;
    const finalScore = Math.min(900, Math.max(300, baseScore + variance));
    
    let scoreBand = 'POOR';
    if(finalScore > 650) scoreBand = 'FAIR';
    if(finalScore > 700) scoreBand = 'GOOD';
    if(finalScore > 750) scoreBand = 'EXCELLENT';

    let riskLevel = 'HIGH';
    if(finalScore > 650) riskLevel = 'MEDIUM';
    if(finalScore > 720) riskLevel = 'LOW';

    // 2. Generate Loans (Accounts)
    const loans: Loan[] = [];
    const loanCount = 2 + Math.floor(Math.random() * 5); // 2 to 6 loans
    let activeLoans = 0;
    let closedLoans = 0;
    let overdueAccounts = 0;

    for(let i=0; i<loanCount; i++) {
        const isOpen = Math.random() > 0.3;
        const type = LOAN_TYPES[Math.floor(Math.random() * LOAN_TYPES.length)];
        const isCreditCard = type === 'Credit Card';
        const amt = (10000 + Math.floor(Math.random() * 500000));
        const overdue = Math.random() > 0.8 ? Math.floor(Math.random() * 5000) : 0;
        
        if (isOpen) activeLoans++; else closedLoans++;
        if (overdue > 0) overdueAccounts++;

        const dateOpened = new Date(Date.now() - Math.floor(Math.random() * 100000000000)).toISOString().split('T')[0];
        const dateClosed = !isOpen ? new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString().split('T')[0] : undefined;

        // Written Off Logic
        const isWrittenOff = Math.random() > 0.95;
        const isSettled = !isWrittenOff && Math.random() > 0.95;
        const status = isWrittenOff ? 'Written Off' : isSettled ? 'Settled' : isOpen ? 'Active' : 'Closed';

        loans.push({
            memberName: BANKS[Math.floor(Math.random() * BANKS.length)],
            accountType: type,
            accountNumber: 'XXXX' + Math.floor(100000 + Math.random() * 900000),
            ownership: 'Individual',
            dateOpened: dateOpened,
            dateLastPayment: new Date().toISOString().split('T')[0],
            dateReported: new Date().toISOString().split('T')[0],
            dateClosed: dateClosed,
            
            sanctionedAmount: isCreditCard ? 0 : amt,
            creditLimit: isCreditCard ? amt : undefined,
            cashLimit: isCreditCard ? Math.floor(amt * 0.2) : undefined,
            
            currentBalance: isOpen ? Math.floor(amt * 0.6) : 0,
            amountOverdue: overdue,
            rateOfInterest: (8 + Math.random() * 10).toFixed(1) + '%',
            repaymentTenure: isCreditCard ? 'N/A' : (12 + Math.floor(Math.random() * 48)),
            emiAmount: isCreditCard ? 0 : Math.floor(amt / 24),
            paymentFrequency: 'Monthly',
            
            collateralType: type === 'Housing Loan' || type === 'Auto Loan' ? 'Property/Vehicle' : 'None',
            collateralValue: type === 'Housing Loan' ? amt * 1.2 : 0,
            
            suitFiledStatus: Math.random() > 0.98 ? 'Suit Filed' : 'No Suit Filed',
            wilfulDefaultStatus: Math.random() > 0.99 ? 'Yes' : 'No',
            
            writtenOffStatus: isWrittenOff ? 'Written Off' : isSettled ? 'Settled' : '',
            writtenOffAmountTotal: isWrittenOff ? Math.floor(amt * 0.4) : 0,
            settlementAmount: isSettled ? Math.floor(amt * 0.5) : 0,
            settlementDate: isSettled ? new Date().toISOString().split('T')[0] : undefined,
            
            status: status,
            accountStatus: status, // mapped
            paymentHistory: generatePaymentHistory(2023, 24)
        });
    }

    // 3. Enquiries
    const enquiries: Enquiry[] = [];
    const enqCount = Math.floor(Math.random() * 4);
    for(let i=0; i<enqCount; i++) {
        enquiries.push({
            memberName: BANKS[Math.floor(Math.random() * BANKS.length)],
            date: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString().split('T')[0],
            purpose: LOAN_TYPES[Math.floor(Math.random() * LOAN_TYPES.length)],
            amount: 50000 + Math.floor(Math.random() * 100000)
        });
    }

    // 4. Detailed Sections Generation
    const addresses: BureauAddress[] = user.address.map((addr, idx) => ({
        address: addr,
        category: idx === 0 ? 'Permanent' : 'Residence',
        residenceCode: idx === 0 ? '01' : '02',
        dateReported: new Date().toISOString().split('T')[0]
    }));
    // Add a secondary address mock
    if(addresses.length < 2) {
        addresses.push({
            address: '123, Corporate Park, Financial District, Mumbai - 400001',
            category: 'Office',
            residenceCode: '03',
            dateReported: '2022-05-10'
        });
    }

    const identifications: BureauIdentification[] = [
        { type: 'PAN', number: user.pan, issueDate: '2015-06-01' },
    ];
    if(user.idType && user.idType !== 'PAN') {
        identifications.push({ type: user.idType, number: user.idNumber || 'N/A' });
    }
    // Mock Voter ID randomly
    if(Math.random() > 0.5) {
        identifications.push({ type: 'Voter ID', number: 'ABC1234567', issueDate: '2018-01-01' });
    }

    const contacts: BureauContact[] = [
        { type: 'Mobile', value: user.mobile },
        { type: 'Email', value: user.email }
    ];

    const employments: BureauEmployment[] = [
        { 
            occupation: user.occupation, 
            employerName: EMPLOYERS[Math.floor(Math.random() * EMPLOYERS.length)],
            income: user.income, 
            netGrossIndicator: 'Gross', 
            frequency: 'Annual',
            dateReported: new Date().toISOString().split('T')[0]
        }
    ];

    return {
        id: `RPT-${bureau}-${Date.now()}`,
        bureau: bureau,
        reportType: 'Consumer Credit Report',
        status: 'SUCCESS',
        referenceId: `REF-${Math.floor(Math.random() * 1000000)}`,
        controlNumber: Math.floor(100000000 + Math.random() * 900000000).toString(),
        
        score: finalScore,
        scoreBand,
        scoreRange: '300-900',
        scoreDate: now.toLocaleDateString(),
        riskLevel,
        scoreDescription: `The score is calculated based on credit history found in the ${bureau} database.`,
        
        reportDate: now.toISOString(),
        consumer: {
            name: user.fullName,
            dob: user.dob,
            gender: user.gender,
            pan: user.pan,
            mobile: user.mobile,
            addresses,
            identifications,
            contacts,
            employments
        },
        accountsSummary: {
            totalLoans: loans.length,
            activeLoans,
            closedLoans,
            overdueAccounts
        },
        loans,
        enquiries,
        
        bureauRemarks: "Data reported by members is subject to updates.",
        legalDisclaimerText: "The information contained in this report has been collated from data provided by credit institutions.",
        
        transactionId: transactionId,
        userId: user.id,
        generatedBy: generatorId,
        version: version
    };
};
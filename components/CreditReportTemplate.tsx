import React from 'react';
import { CreditReport, User, PaymentHistoryMonth } from '../types';
import { Lock, AlertCircle, Clock } from 'lucide-react';

interface Props {
  report: CreditReport;
  user: User;
  isUnlocked?: boolean;
}

const MONTH_ORDER = ['DEC', 'NOV', 'OCT', 'SEP', 'AUG', 'JUL', 'JUN', 'MAY', 'APR', 'MAR', 'FEB', 'JAN'];

const groupHistoryByYear = (history: PaymentHistoryMonth[]) => {
  const years: Record<number, Record<string, string>> = {};
  history.forEach(h => {
    if (!years[h.year]) years[h.year] = {};
    years[h.year][h.month] = h.status;
  });
  return Object.keys(years).sort((a, b) => parseInt(b) - parseInt(a)).map(y => ({
    year: parseInt(y),
    months: years[parseInt(y)]
  }));
};

const SectionHeader = ({ title }: { title: string }) => (
  <div className="bg-cibil-blue text-white px-4 py-1.5 font-bold text-sm uppercase mt-8 mb-4 print:mt-4 print:mb-2 tracking-wide flex items-center">
    {title}
  </div>
);

const LabelVal = ({ label, val, className = '' }: { label: string, val: string | number | undefined, className?: string }) => (
  <div className={`mb-3 ${className}`}>
    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">{label}</div>
    <div className="text-xs font-semibold text-gray-900 break-words">{val !== undefined && val !== null && val !== '' ? val : '-'}</div>
  </div>
);

export const CreditReportTemplate: React.FC<Props> = ({ report, user }) => {
  
  if (report.status === 'PENDING') {
      return (
          <div className="flex flex-col items-center justify-center min-h-[400px] border rounded-lg bg-slate-50 p-8">
              <Clock size={48} className="text-blue-500 mb-4 animate-pulse" />
              <h3 className="text-xl font-bold text-slate-800">Report Under Process</h3>
              <p className="text-slate-500 text-center mt-2 max-w-sm">
                  We have requested data from {report.bureau}. This typically takes 30-60 seconds. Please check back shortly.
              </p>
          </div>
      )
  }

  if (report.status === 'FAILED') {
      return (
          <div className="flex flex-col items-center justify-center min-h-[400px] border rounded-lg bg-red-50 p-8">
              <AlertCircle size={48} className="text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-red-800">Generation Failed</h3>
              <p className="text-red-600 text-center mt-2 max-w-sm">
                  We could not fetch data from {report.bureau} at this moment. Please try again later.
              </p>
          </div>
      )
  }

  const { consumer } = report;

  // SUCCESS STATE
  return (
    <div className="w-full font-sans bg-white relative text-slate-900">
      
      {/* DISCLAIMER for MOCK */}
      <div className="no-print bg-yellow-50 text-yellow-800 text-xs px-4 py-2 text-center border-b border-yellow-200 mb-4 rounded">
          NOTE: This is a demo credit report. Actual data will be fetched after bureau verification.
      </div>

      <div className="relative min-h-[500px]">
        
        {/* HEADER */}
        <div className="flex justify-between items-start mb-10 border-b border-gray-200 pb-6">
           <div className="w-1/2">
              <div className="text-3xl font-extrabold text-cibil-blue uppercase tracking-tight mb-2">Powered by {report.bureau}</div>
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{report.reportType || "Consumer Credit Information Report"}</div>
           </div>
           <div className="text-right space-y-1">
              <div className="text-[10px] font-bold text-cibil-blue uppercase">Control Number: {report.controlNumber}</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase">Date: {new Date(report.reportDate).toLocaleDateString()}</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase">Time: {new Date(report.reportDate).toLocaleTimeString()}</div>
           </div>
        </div>

        {/* SCORE SECTION */}
        <div className="relative mb-12">
           <div className="bg-cibil-blue h-10 flex items-center px-4 mb-8 w-full">
              <span className="text-white font-bold text-sm tracking-wide uppercase">{report.bureau} SCORE</span>
           </div>
           <div className="flex items-start">
               <div className="h-28 w-40 bg-gray-50 flex items-center justify-center border-b-4 border-cibil-blue shadow-sm flex-col mr-8 border border-gray-100">
                   <span className="text-5xl font-extrabold text-cibil-blue tracking-tight">{report.score}</span>
                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded mt-2 uppercase tracking-wide ${report.scoreBand === 'POOR' ? 'bg-red-100 text-red-700' : report.scoreBand === 'EXCELLENT' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                       {report.scoreBand}
                   </span>
               </div>
               <div className="flex-1 pt-2">
                   <div className="text-xs font-bold text-gray-500 uppercase mb-2">Score Analysis</div>
                   <p className="text-sm text-gray-700 leading-relaxed max-w-xl">
                       {report.scoreDescription || "Your score is calculated based on your credit history."}
                       <span className="block mt-2 font-semibold">Risk Level: <span className={report.riskLevel === 'HIGH' ? 'text-red-600' : 'text-green-600'}>{report.riskLevel}</span></span>
                       <span className="block mt-1 text-xs text-gray-500">Score Range: {report.scoreRange || "300-900"}</span>
                   </p>
               </div>
           </div>
        </div>

        {/* PERSONAL INFORMATION */}
        <SectionHeader title="Personal Information" />
        <div className="grid grid-cols-4 gap-y-6 gap-x-4 mb-8 bg-gray-50 p-4 border border-gray-100">
           <LabelVal label="Name" val={consumer.name?.toUpperCase()} className="col-span-2" />
           <LabelVal label="Date of Birth" val={consumer.dob} />
           <LabelVal label="Gender" val={consumer.gender} />
           <LabelVal label="Primary Mobile" val={consumer.mobile} />
           <LabelVal label="PAN" val={consumer.pan} />
        </div>

        {/* IDENTIFICATION INFORMATION */}
        <SectionHeader title="Identification Information" />
        <div className="mb-8 overflow-hidden border border-gray-200">
            <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 font-bold text-gray-600 uppercase">
                    <tr>
                        <th className="px-4 py-2 w-1/4">ID Type</th>
                        <th className="px-4 py-2 w-1/4">ID Number</th>
                        <th className="px-4 py-2 w-1/4">Issue Date</th>
                        <th className="px-4 py-2 w-1/4">Expiry Date</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {consumer.identifications.map((id, i) => (
                        <tr key={i}>
                            <td className="px-4 py-2 font-semibold">{id.type}</td>
                            <td className="px-4 py-2">{id.number}</td>
                            <td className="px-4 py-2">{id.issueDate || '-'}</td>
                            <td className="px-4 py-2">{id.expiryDate || '-'}</td>
                        </tr>
                    ))}
                    {consumer.identifications.length === 0 && <tr><td colSpan={4} className="px-4 py-2 text-gray-400">No IDs Reported</td></tr>}
                </tbody>
            </table>
        </div>

        {/* CONTACT INFORMATION */}
        <SectionHeader title="Contact Information" />
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border border-gray-200">
                <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-600 uppercase border-b border-gray-200">Addresses</div>
                <div className="p-4 space-y-4">
                    {consumer.addresses.map((addr, i) => (
                        <div key={i} className="text-xs">
                            <div className="font-semibold text-gray-800 mb-1">{addr.address}</div>
                            <div className="text-gray-500 flex gap-4">
                                <span>Cat: {addr.category}</span>
                                {addr.residenceCode && <span>Code: {addr.residenceCode}</span>}
                                <span>Rep: {addr.dateReported}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="border border-gray-200 h-fit">
                <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-600 uppercase border-b border-gray-200">Email & Phones</div>
                <div className="divide-y divide-gray-100">
                    {consumer.contacts.map((c, i) => (
                        <div key={i} className="px-4 py-2 flex justify-between text-xs">
                            <span className="font-semibold text-gray-700">{c.type}</span>
                            <span className="text-gray-900">{c.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* EMPLOYMENT INFORMATION */}
        <SectionHeader title="Employment Information" />
        <div className="mb-8 overflow-hidden border border-gray-200">
             <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 font-bold text-gray-600 uppercase">
                    <tr>
                        <th className="px-4 py-2">Occupation</th>
                        <th className="px-4 py-2">Employer</th>
                        <th className="px-4 py-2">Income</th>
                        <th className="px-4 py-2">Frequency</th>
                        <th className="px-4 py-2">Indicator</th>
                        <th className="px-4 py-2">Reported</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {consumer.employments.map((emp, i) => (
                        <tr key={i}>
                            <td className="px-4 py-2 font-semibold">{emp.occupation}</td>
                            <td className="px-4 py-2">{emp.employerName || '-'}</td>
                            <td className="px-4 py-2">{emp.income}</td>
                            <td className="px-4 py-2">{emp.frequency}</td>
                            <td className="px-4 py-2">{emp.netGrossIndicator}</td>
                            <td className="px-4 py-2">{emp.dateReported}</td>
                        </tr>
                    ))}
                    {consumer.employments.length === 0 && <tr><td colSpan={6} className="px-4 py-2 text-gray-400">No Employment Data</td></tr>}
                </tbody>
            </table>
        </div>

        {/* ACCOUNTS SUMMARY */}
         <div className="grid grid-cols-4 gap-4 bg-gray-50 p-4 rounded mb-8 border border-gray-100">
            <LabelVal label="Total Accounts" val={report.accountsSummary.totalLoans} />
            <LabelVal label="Active Accounts" val={report.accountsSummary.activeLoans} />
            <LabelVal label="Closed Accounts" val={report.accountsSummary.closedLoans} />
            <LabelVal label="Overdue Accounts" val={report.accountsSummary.overdueAccounts} className={report.accountsSummary.overdueAccounts > 0 ? "text-red-600" : ""} />
        </div>

        {/* ACCOUNT INFORMATION (LOANS) */}
        <SectionHeader title="Account Information" />
        <div className="space-y-8">
          {report.loans.map((loan, idx) => {
             const paymentHistoryByYear = groupHistoryByYear(loan.paymentHistory);
             
             return (
            <div key={idx} className="account-card break-inside-avoid border border-gray-200 bg-white">
               {/* Account Header */}
               <div className="bg-cibil-yellow px-4 py-2 flex justify-between items-center text-[11px] font-bold text-gray-900 uppercase border-b border-gray-200">
                  <div className="w-1/3 text-ellipsis overflow-hidden whitespace-nowrap">{loan.memberName}</div>
                  <div className="w-1/4 text-center">{loan.accountType}</div>
                  <div className="w-1/4 text-center">{loan.accountNumber}</div>
                  <div className="w-1/6 text-right">{loan.ownership}</div>
               </div>

               <div className="p-4 grid grid-cols-3 gap-x-8 gap-y-6">
                  {/* Column 1: Amounts */}
                  <div className="space-y-4">
                     <div className="text-[10px] font-bold text-cibil-blue uppercase border-b border-gray-100 pb-1">Balance & Limits</div>
                     <div className="grid grid-cols-2 gap-y-3">
                        {loan.accountType === 'Credit Card' ? (
                            <>
                                <LabelVal label="Credit Limit" val={loan.creditLimit} />
                                <LabelVal label="Cash Limit" val={loan.cashLimit} />
                            </>
                        ) : (
                            <LabelVal label="Sanctioned Amt" val={loan.sanctionedAmount} />
                        )}
                        <LabelVal label="Current Bal" val={loan.currentBalance} />
                        <LabelVal label="Overdue Amt" val={loan.amountOverdue} className={loan.amountOverdue > 0 ? "text-red-600" : ""} />
                        {loan.settlementAmount ? <LabelVal label="Settlement Amt" val={loan.settlementAmount} /> : null}
                        {loan.writtenOffAmountTotal ? <LabelVal label="Written Off Amt" val={loan.writtenOffAmountTotal} /> : null}
                     </div>
                  </div>

                  {/* Column 2: Dates */}
                  <div className="space-y-4">
                     <div className="text-[10px] font-bold text-cibil-blue uppercase border-b border-gray-100 pb-1">Key Dates</div>
                     <div className="grid grid-cols-2 gap-y-3">
                        <LabelVal label="Opened" val={loan.dateOpened} />
                        <LabelVal label="Closed" val={loan.dateClosed} />
                        <LabelVal label="Last Payment" val={loan.dateLastPayment} />
                        <LabelVal label="Reported" val={loan.dateReported} />
                        {loan.settlementDate && <LabelVal label="Settled On" val={loan.settlementDate} />}
                     </div>
                  </div>

                  {/* Column 3: Terms & Status */}
                  <div className="space-y-4">
                     <div className="text-[10px] font-bold text-cibil-blue uppercase border-b border-gray-100 pb-1">Terms & Status</div>
                     <div className="grid grid-cols-2 gap-y-3">
                        <LabelVal label="ROI" val={loan.rateOfInterest} />
                        <LabelVal label="Tenure" val={loan.repaymentTenure} />
                        <LabelVal label="EMI" val={loan.emiAmount} />
                        <LabelVal label="Frequency" val={loan.paymentFrequency} />
                        <LabelVal label="Status" val={loan.status} className="font-bold" />
                        <LabelVal label="Collateral" val={loan.collateralType !== 'None' ? loan.collateralType : undefined} />
                     </div>
                  </div>
               </div>
               
               {/* Extended Account Details Row if Applicable */}
               {(loan.suitFiledStatus !== 'No Suit Filed' || loan.writtenOffStatus || loan.wilfulDefaultStatus === 'Yes') && (
                   <div className="bg-red-50 px-4 py-2 text-xs border-t border-red-100 flex gap-6 text-red-700 font-semibold">
                       {loan.suitFiledStatus !== 'No Suit Filed' && <span>⚠ {loan.suitFiledStatus}</span>}
                       {loan.writtenOffStatus && <span>⚠ {loan.writtenOffStatus}</span>}
                       {loan.wilfulDefaultStatus === 'Yes' && <span>⚠ Wilful Default</span>}
                   </div>
               )}

               {/* Payment History Grid */}
               <div className="px-4 pb-4 pt-2">
                 <div className="text-[10px] font-bold text-cibil-blue uppercase mb-2">
                   Payment History (Asset Classification)
                 </div>
                 <div className="border border-gray-800 text-center text-[9px] font-medium">
                   <div className="flex bg-gray-100 border-b border-gray-800">
                      <div className="w-12 py-1.5 border-r border-gray-800 shrink-0 font-bold">YEAR</div>
                      {MONTH_ORDER.map(m => (
                         <div key={m} className="flex-1 py-1.5 border-r border-gray-800 font-bold last:border-0">{m}</div>
                      ))}
                   </div>
                   {paymentHistoryByYear.map((grp) => (
                      <div key={grp.year} className="flex border-b border-gray-800 last:border-0">
                         <div className="w-12 py-1.5 border-r border-gray-800 shrink-0 font-bold bg-gray-50">{grp.year}</div>
                         {MONTH_ORDER.map(m => {
                             const status = grp.months[m] || '';
                             let statusColor = '';
                             if (['STD', '000'].includes(status)) statusColor = 'text-green-700';
                             else if (['SMA', 'SUB', 'DBT', 'LSS'].includes(status) || parseInt(status) > 0) statusColor = 'text-red-600 font-bold bg-red-50';
                             
                             return (
                                 <div key={m} className={`flex-1 py-1.5 border-r border-gray-800 last:border-0 ${statusColor}`}>
                                    {status}
                                 </div>
                             );
                         })}
                      </div>
                   ))}
                 </div>
                 
                 <div className="mt-2 text-[9px] text-gray-500 flex gap-4 flex-wrap">
                     <span>STD: Standard</span>
                     <span>SMA: Special Mention Account</span>
                     <span>SUB: Sub-Standard</span>
                     <span>DBT: Doubtful</span>
                     <span>LSS: Loss</span>
                     <span>XXX: Not Reported</span>
                     <span>###: Number of days past due</span>
                 </div>
               </div>
            </div>
          )})}
        </div>

        {/* ENQUIRY INFORMATION */}
        <SectionHeader title="Enquiry Information" />
        <div className="mb-8 border border-gray-200">
           <div className="grid grid-cols-4 py-2 bg-gray-100 border-b border-gray-200">
              <div className="text-[10px] font-bold text-gray-600 uppercase px-4">Member Name</div>
              <div className="text-[10px] font-bold text-gray-600 uppercase px-4">Date of Enquiry</div>
              <div className="text-[10px] font-bold text-gray-600 uppercase px-4">Purpose</div>
              <div className="text-[10px] font-bold text-gray-600 uppercase px-4 text-right">Amount</div>
           </div>
           {report.enquiries.map((enq, idx) => (
              <div key={idx} className="grid grid-cols-4 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                 <div className="text-xs font-semibold text-gray-800 px-4">{enq.memberName}</div>
                 <div className="text-xs text-gray-600 px-4">{enq.date}</div>
                 <div className="text-xs text-gray-600 px-4">{enq.purpose}</div>
                 <div className="text-xs text-gray-600 px-4 text-right">{enq.amount ? `₹${enq.amount}` : '-'}</div>
              </div>
           ))}
           {report.enquiries.length === 0 && <div className="p-4 text-xs text-gray-400">No Enquiries Found</div>}
        </div>
        
        {/* Footer */}
        <div className="mt-12 mb-6">
            <div className="bg-cibil-blue text-white text-center text-[10px] py-2 font-bold uppercase tracking-wider mb-2">
            End of Credit Information Report
            </div>
            <p className="text-[9px] text-gray-400 text-center leading-tight">
                {report.legalDisclaimerText || "Disclaimer: The information contained in this report has been collated from data provided by credit institutions."}
            </p>
            <p className="text-[9px] text-gray-400 text-center mt-1">
                © {new Date().getFullYear()} {report.bureau}. All Rights Reserved.
            </p>
        </div>

      </div>
    </div>
  );
};
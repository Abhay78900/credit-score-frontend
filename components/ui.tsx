import React from 'react';

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', isLoading, className = '', ...props 
}) => {
  const base = "px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-md hover:shadow-lg",
    secondary: "bg-slate-800 text-white hover:bg-slate-900",
    outline: "border-2 border-brand-600 text-brand-600 hover:bg-brand-50",
    danger: "bg-red-500 text-white hover:bg-red-600"
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? (
        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
      ) : null}
      {children}
    </button>
  );
};

// Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
      <input 
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors ${error ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
        {...props}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

// Card
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 p-6 ${className}`}>
    {children}
  </div>
);

// Badge
export const Badge: React.FC<{ children: React.ReactNode; color?: 'green' | 'red' | 'yellow' | 'blue' | 'purple' }> = ({ children, color = 'blue' }) => {
  const colors = {
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800'
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
};
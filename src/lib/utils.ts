import { Transaction } from '@/types/transaction';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const calculateSummary = (transactions: Transaction[]) => {
  const totalCredits = transactions.reduce((sum, t) => sum + (t.credit > 0 ? t.credit : 0), 0);
  const totalDebits = transactions.reduce((sum, t) => sum + (t.credit < 0 ? Math.abs(t.credit) : 0), 0);
  const currentBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;
  const avgTransaction = transactions.length > 0 ? totalCredits / transactions.length : 0;

  return {
    totalCredits,
    totalDebits,
    currentBalance,
    avgTransaction
  };
};

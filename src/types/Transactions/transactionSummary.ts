export interface TransactionSummary {
  transactionCount: number;
  totalCredits: number;
  totalDebits: number;
  currentBalance: number;
  averageTransaction: number;
  uncategorizedCount: number;
  dateRange: {
    from: string;
    to: string;
  };
  categoryBreakdown: {
    category: string;
    count: number;
    total: number;
  }[];
}
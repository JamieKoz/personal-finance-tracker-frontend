import { DollarSign, TrendingUp, TrendingDown, FileText, Tag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { TransactionSummary } from '@/types/Transactions/transactionSummary';


interface SummaryCardsProps {
  summary: TransactionSummary;
  uncategorizedCount: number;
  onCategorizeClick: () => void;
}

export default function SummaryCards({ summary, uncategorizedCount, onCategorizeClick }: SummaryCardsProps) {
  const currentBalance = summary.currentBalance || 0; // Handle undefined
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Net Amount</dt>
              <dd className="text-lg font-medium text-gray-900">{formatCurrency(currentBalance)}</dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Total Credits</dt>
              <dd className="text-lg font-medium text-gray-900">{formatCurrency(summary.totalCredits || 0)}</dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <TrendingDown className="h-8 w-8 text-red-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Total Debits</dt>
              <dd className="text-lg font-medium text-gray-900">{formatCurrency(summary.totalDebits || 0)}</dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <FileText className="h-8 w-8 text-purple-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Total Transactions</dt>
              <dd className="text-lg font-medium text-gray-900">{(summary.transactionCount || 0).toLocaleString()}</dd>
            </dl>
          </div>
        </div>
      </div>

    </div>
  );
}

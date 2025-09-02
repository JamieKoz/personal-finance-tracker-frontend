import { DollarSign, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { SummaryCardsProps } from '@/interfaces/Props/summaryCardsProps';


export default function SummaryCards({ summary }: SummaryCardsProps) {
  const currentBalance = summary.currentBalance || 0; // Handle undefined
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Net Amount</dt>
              <dd className="text-lg font-medium text-gray-900 dark:text-white">{formatCurrency(currentBalance)}</dd>
            </dl>
          </div>
        </div>
      </div>

      

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <FileText className="h-8 w-8 text-purple-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Transactions</dt>
              <dd className="text-lg font-medium text-gray-900 dark:text-white">{(summary.transactionCount || 0).toLocaleString()}</dd>
            </dl>
          </div>
        </div>
      </div>

    </div>
  );
}

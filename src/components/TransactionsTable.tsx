'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Search, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Transaction } from '@/types/Transactions/transaction';

interface TransactionsTableProps {
  transactions: Transaction[];
  onTransactionClick: (transaction: Transaction) => void;
  onFiltersChange: (filters: {
    search?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    category?: string;
  }) => void;
  loading?: boolean;
}

type SortField = keyof Transaction;
type SortDirection = 'asc' | 'desc';

export default function TransactionsTable({ 
  transactions, 
  onTransactionClick, 
  onFiltersChange,
  loading = false 
}: TransactionsTableProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const categories = [...new Set(transactions.map(t => t.category).filter(Boolean))];

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onFiltersChange({
        search: searchTerm,
        sortField: sortField,
        sortDirection: sortDirection,
        category: filterCategory
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, sortField, sortDirection, filterCategory, onFiltersChange]);

  const handleSort = useCallback((field: SortField) => {
    let newSortDirection: SortDirection;
    if (sortField === field) {
      newSortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      newSortDirection = 'asc';
    }
    
    setSortField(field);
    setSortDirection(newSortDirection);
  }, [sortField, sortDirection]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterCategory(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-lg font-medium text-gray-900">Transactions</h3>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-black" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search transactions..."
                className="block w-full sm:w-64 pl-10 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 text-black"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={handleCategoryChange}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchTerm || filterCategory) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {searchTerm && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Search: `{searchTerm}`
                <button
                  onClick={clearSearch}
                  className="ml-1.5 h-3 w-3 text-blue-400 hover:text-blue-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filterCategory && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Category: {filterCategory}
                <button
                  onClick={() => setFilterCategory('')}
                  className="ml-1.5 h-3 w-3 text-green-400 hover:text-green-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-600">Loading transactions...</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date')}
                >
                  Date
                  {sortField === 'date' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('description')}
                >
                  Description
                  {sortField === 'description' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('category')}
                >
                  Category
                  {sortField === 'category' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('credit')}
                >
                  Amount
                  {sortField === 'credit' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('balance')}
                >
                  Balance
                  {sortField === 'balance' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr 
                  key={transaction.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onTransactionClick(transaction)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate" title={transaction.description}>
                      {searchTerm && transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ? (
                        <span dangerouslySetInnerHTML={{
                          __html: transaction.description.replace(
                            new RegExp(`(${searchTerm})`, 'gi'),
                            '<mark class="bg-yellow-200">$1</mark>'
                          )
                        }} />
                      ) : (
                        transaction.description
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                      {transaction.category || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={transaction.credit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(transaction.credit)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(transaction.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {!loading && transactions.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterCategory ? 'Try adjusting your search or filters.' : 'Upload a CSV file to get started.'}
          </p>
        </div>
      )}
    </div>
  );
}

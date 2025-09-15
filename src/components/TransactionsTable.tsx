'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Search, X, ChevronDown, Filter } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Transaction } from '@/types/Transactions/transaction';
import { Category } from '@/types/Categories/category';
import { apiService } from '@/lib/api';

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
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(true);

  // Fetch all categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const categories = await apiService.getCategories();
        setAllCategories(categories);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

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

  const getSortOptions = () => [
    { value: 'date', label: 'Date' },
    { value: 'description', label: 'Description' },
    { value: 'category', label: 'Category' },
    { value: 'credit', label: 'Amount' },
    { value: 'balance', label: 'Balance' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col gap-4">
          {/* Header and Mobile Filter Toggle */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Transactions</h3>
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="md:hidden flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              <ChevronDown className={`h-4 w-4 ml-1 transform transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Desktop Filters */}
          <div className="hidden md:flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {/* Search Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search transactions..."
                  className="block w-full sm:w-64 pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                disabled={categoriesLoading}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {categoriesLoading ? 'Loading categories...' : 'All Categories'}
                </option>
                {allCategories.map(category => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile Filters */}
          {showMobileFilters && (
            <div className="md:hidden flex flex-col gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              {/* Search Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search transactions..."
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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

              {/* Mobile Sorting and Category Filter */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <select
                    value={`${sortField}-${sortDirection}`}
                    onChange={(e) => {
                      const [field, direction] = e.target.value.split('-') as [SortField, SortDirection];
                      setSortField(field);
                      setSortDirection(direction);
                    }}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                  >
                    {getSortOptions().map(option => (
                      <optgroup key={option.value} label={option.label}>
                        <option value={`${option.value}-asc`}>{option.label} (A-Z)</option>
                        <option value={`${option.value}-desc`}>{option.label} (Z-A)</option>
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <select
                    value={filterCategory}
                    onChange={handleCategoryChange}
                    disabled={categoriesLoading}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {categoriesLoading ? 'Loading...' : 'All Categories'}
                    </option>
                    {allCategories.map(category => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Active Filters Display */}
          {(searchTerm || filterCategory) && (
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
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
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
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
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Loading transactions...</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-950"
                    onClick={() => handleSort('date')}
                  >
                    Date
                    {sortField === 'date' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-950"
                    onClick={() => handleSort('description')}
                  >
                    Description
                    {sortField === 'description' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-950"
                    onClick={() => handleSort('category')}
                  >
                    Category
                    {sortField === 'category' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-950"
                    onClick={() => handleSort('credit')}
                  >
                    Amount
                    {sortField === 'credit' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-950"
                    onClick={() => handleSort('balance')}
                  >
                    Balance
                    {sortField === 'balance' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {transactions.map((transaction) => (
                  <tr 
                    key={transaction.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                    onClick={() => onTransactionClick(transaction)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      <div className="max-w-xs truncate" title={transaction.description}>
                        {searchTerm && transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ? (
                          <span dangerouslySetInnerHTML={{
                            __html: transaction.description.replace(
                              new RegExp(`(${searchTerm})`, 'gi'),
                              '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>'
                            )
                          }} />
                        ) : (
                          transaction.description
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        {transaction.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={transaction.credit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(transaction.credit)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatCurrency(transaction.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.map((transaction) => (
              <div 
                key={transaction.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                onClick={() => onTransactionClick(transaction)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {searchTerm && transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ? (
                        <span dangerouslySetInnerHTML={{
                          __html: transaction.description.replace(
                            new RegExp(`(${searchTerm})`, 'gi'),
                            '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>'
                          )
                        }} />
                      ) : (
                        transaction.description
                      )}
                    </p>
                    <div className="flex items-center mt-1 space-x-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(transaction.date)}
                      </p>
                      {transaction.category && (
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-white">
                          {transaction.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className={`text-sm font-semibold ${transaction.credit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(transaction.credit)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Bal: {formatCurrency(transaction.balance)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      
      {!loading && transactions.length === 0 && (
        <div className="text-center py-12 px-4">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No transactions found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || filterCategory ? 'Try adjusting your search or filters.' : 'Upload a CSV file to get started.'}
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { PieChart, AlertCircle, Tag } from 'lucide-react';
import { apiService } from '@/lib/api';
import { Transaction, TransactionSummary, PaginationInfo, TransactionFilters } from '@/types/transaction';
import FileUpload from '@/components/FileUpload';
import SummaryCards from '@/components/SummaryCards';
import TransactionsTable from '@/components/TransactionsTable';
import TransactionModal from '@/components/TransactionModal';
import Pagination from '@/components/Pagination';
import CategorizationModal from '@/components/CategorizationModal';
import FinancialCharts from '@/components/FinancialCharts';

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filters, setFilters] = useState<TransactionFilters>({
    sortField: 'date',
    sortDirection: 'desc'
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showCategorizationModal, setShowCategorizationModal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uncategorizedCount, setUncategorizedCount] = useState<number>(0);

  const fetchTransactions = useCallback(async (page: number = 1, newFilters?: TransactionFilters) => {
    setLoading(true);
    setError(null);
    try {
      const filtersToUse = newFilters || filters;
      const response = await apiService.getTransactions(page, 50, filtersToUse);
      setTransactions(response.data || []);
      setPagination(response.pagination);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to load transactions: ${errorMessage}`);
      setTransactions([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const summaryData = await apiService.getTransactionSummary();
      setSummary(summaryData);
      setUncategorizedCount(summaryData.uncategorizedCount || 0);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      setUncategorizedCount(0);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
    fetchSummary();
  }, []);

  const handleUploadSuccess = () => {
    fetchTransactions(1);
    fetchSummary();
  };

 const handleFiltersChange = useCallback((newFilters: TransactionFilters) => {
    setFilters(newFilters);
    // Reset to page 1 when filters change
    fetchTransactions(1, newFilters);
  }, []);

  const handlePageChange = (page: number) => {
    fetchTransactions(page);
  };

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowModal(true);
  };

  const handleCategorizationSuccess = () => {
    fetchTransactions(currentPage);
    fetchSummary();
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTransaction(null);
  };

  const retryFetch = () => {
    fetchTransactions(currentPage);
    fetchSummary();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center">
              <PieChart className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Personal Finance Tracker</h1>
                <p className="text-xs text-gray-500">Track your financial activity</p>
              </div>
            </div>

            {/* Upload and Actions Section */}
            <div className="flex items-center space-x-4">
              {uncategorizedCount > 0 && (
                <button
                  onClick={() => setShowCategorizationModal(true)}
                  className="flex items-center px-3 py-2 bg-orange-100 text-orange-800 text-sm rounded-md hover:bg-orange-200 transition-colors"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Uncategorized Transactions ({uncategorizedCount})
                </button>
              )}
              
              {/* Compact File Upload */}
              <FileUpload 
                onUploadSuccess={handleUploadSuccess} 
                isUploading={isUploading}
                setIsUploading={setIsUploading}
                compact={true} // For navigation
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={retryFetch}
                  className="mt-2 text-sm text-red-700 underline hover:text-red-900"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {summary && !summaryLoading && (
          <SummaryCards
            summary={summary}
            uncategorizedCount={uncategorizedCount}
            onCategorizeClick={() => setShowCategorizationModal(true)}
          />
        )}

        {/* Charts Section - Main Focus */}
        {summary && !summaryLoading && (
          <FinancialCharts summary={summary} />
        )}

        {/* Loading State for Summary */}
        {summaryLoading && (
          <div className="mb-8 text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-600">Loading dashboard...</p>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <TransactionsTable 
            transactions={transactions} 
            onTransactionClick={handleTransactionClick}
            onFiltersChange={handleFiltersChange}
            loading={loading}
          />
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <Pagination 
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        )}
      </main>

      {/* Transaction Modal */}
      <TransactionModal 
        transaction={selectedTransaction}
        isOpen={showModal}
        onClose={handleCloseModal}
        onTransactionUpdated={() => {
          fetchTransactions(currentPage);
          fetchSummary();
        }}
      />

      {/* Categorization Modal */}
      <CategorizationModal
        isOpen={showCategorizationModal}
        onClose={() => setShowCategorizationModal(false)}
        onSuccess={handleCategorizationSuccess}
      />
    </div>
  );
}

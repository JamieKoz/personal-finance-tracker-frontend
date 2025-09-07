'use client';

import { useState, useEffect, useCallback } from 'react';
import { PieChart, AlertCircle, Tag, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/lib/api';
import { Transaction } from '@/types/Transactions/transaction';
import { PaginationInfo } from '@/types/Pagination/paginationInfo';
import { TransactionSummary } from '@/types/Transactions/transactionSummary';
import { TransactionFilters } from '@/types/Transactions/transactionFilters';
import FileUpload from '@/components/FileUpload';
import SummaryCards from '@/components/SummaryCards';
import TransactionsTable from '@/components/TransactionsTable';
import TransactionModal from '@/components/TransactionModal';
import Pagination from '@/components/Pagination';
import CategorizationModal from '@/components/CategorizationModal';
import FinancialCharts from '@/components/FinancialCharts';
import DarkModeToggle from '@/components/DarkModeToggle';
import AuthModal from '@/components/AuthModal';
import UserMenu from '@/components/UserMenu';

function AuthenticatedDashboard() {
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

  const fetchTransactions = useCallback(async (page: number = 1, filtersToUse: TransactionFilters) => {
    setLoading(true);
    setError(null);
    try {
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
  }, []);

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
    fetchTransactions(1, filters);
    fetchSummary();
  }, [fetchTransactions, filters]);

  const handleUploadSuccess = () => {
    fetchTransactions(1, filters);
    fetchSummary();
  };

  const handleFiltersChange = useCallback((newFilters: TransactionFilters) => {
    setFilters(newFilters);
    fetchTransactions(1, newFilters);
  }, [fetchTransactions]);

  const handlePageChange = (page: number) => {
    fetchTransactions(page, filters);
  };

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowModal(true);
  };

  const handleCategorizationSuccess = () => {
    fetchTransactions(currentPage, filters);
    fetchSummary();
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTransaction(null);
  };

  const retryFetch = () => {
    fetchTransactions(currentPage, filters);
    fetchSummary();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Navigation Header */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center">
              <PieChart className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Personal Finance Tracker</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Track your financial activity</p>
              </div>
            </div>

            {/* Upload and Actions Section */}
            <div className="flex items-center space-x-4">
              <DarkModeToggle />
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
                compact={true}
              />

              {/* User Menu */}
              <UserMenu />
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

        {/* Charts Section */}
        {summary && !summaryLoading && (
          <FinancialCharts />
        )}

        {/* Loading State for Summary */}
        {summaryLoading && (
          <div className="mb-8 text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Loading dashboard...</p>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-8">
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
          fetchTransactions(currentPage, filters);
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

function UnauthenticatedLanding() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const openAuthModal = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <PieChart className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Personal Finance Tracker</h1>
            </div>
            <div className="flex items-center space-x-4">
              <DarkModeToggle />
              <button
                onClick={() => openAuthModal('login')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">
                <div className="flex items-center">
                  <LogIn className="h-4 w-4 mr-2 " />
                  <span className="text-sm whitespace-nowrap">Sign In</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <div className="mb-8">
            <PieChart className="h-24 w-24 text-blue-600 mx-auto mb-6" />
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Take Control of Your
              <span className="text-blue-600 block">Financial Future</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Upload your bank transactions, categorize your spending, and gain valuable insights into your financial habits with our powerful analytics dashboard.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={() => openAuthModal('register')}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-lg"
            >
              Get Started Free
            </button>
            <button
              onClick={() => openAuthModal('login')}
              className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold rounded-lg transition-colors text-lg"
            >
              Sign In
            </button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <PieChart className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Smart Analytics</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Get detailed insights into your spending patterns with interactive charts and summaries.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Tag className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Auto Categorization</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Automatically categorize transactions and apply patterns to similar future transactions.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Secure & Private</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your financial data is encrypted and stored securely. Only you have access to your information.
              </p>
            </div>
          </div>
        </div>
      </main>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        defaultMode={authMode}
      />
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <AuthenticatedDashboard /> : <UnauthenticatedLanding />;
}

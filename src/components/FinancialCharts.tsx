'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, ComposedChart, Area, AreaChart } from 'recharts';
import { Calendar, TrendingUp, PieChart as PieChartIcon, BarChart as BarChartIcon, Filter, X, Wallet, TrendingDown, DollarSign, Target } from 'lucide-react';
import { apiService } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Transaction } from '@/types/Transactions/transaction';
import { Category } from '@/types/Categories/category';
import { TransactionSummary } from '@/types/Transactions/transactionSummary';
import { ChartsProps } from '@/interfaces/Props/chartsProps';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

export default function FinancialCharts({ summary }: ChartsProps) {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('savings');
  const [excludeInternalTransfers, setExcludeInternalTransfers] = useState(false);
  const [summaryWithTransfers, setSummaryWithTransfers] = useState<TransactionSummary | null>(null);
  
  // Filter states
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (excludeInternalTransfers) {
      fetchSummaryWithoutTransfers();
    }
  }, [excludeInternalTransfers]);

  const fetchSummaryWithoutTransfers = async () => {
    try {
      const summaryData = await apiService.getTransactionSummary(true); // exclude internal transfers
      setSummaryWithTransfers(summaryData);
    } catch (error) {
      console.error('Failed to fetch summary without transfers:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all transactions across multiple pages
      const transactions: Transaction[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 50) { // Safety limit
        const response = await apiService.getTransactions(page, 100);
        transactions.push(...response.data);
        hasMore = response.pagination.hasNextPage;
        page++;
      }

      // Fetch categories
      const categoriesData = await apiService.getCategories();
      
      setAllTransactions(transactions);
      setCategories(categoriesData);

      // Set default date range to last 12 months
      if (transactions.length > 0) {
        const latestDate = new Date(Math.max(...transactions.map(t => new Date(t.date).getTime())));
        const twelveMonthsAgo = new Date(latestDate);
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        
        setDateFrom(twelveMonthsAgo.toISOString().split('T')[0]);
        setDateTo(latestDate.toISOString().split('T')[0]);
      }
    } catch (error) {
      console.error('Failed to fetch transactions for charts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Identify internal transfers client-side for filtering
  const isInternalTransfer = (transaction: Transaction): boolean => {
    const desc = transaction.description?.toLowerCase() || '';
    const cat = transaction.category?.toLowerCase() || '';
    
    const internalPatterns = [
      'transfer', 'tfr', 'internal', 'credit card payment', 'cc payment',
      'loan payment', 'mortgage payment', 'between accounts', 'account transfer',
      'online transfer', 'mobile transfer', 'wire transfer', 'deposit to',
      'withdrawal from', 'move money', 'savings transfer'
    ];
    
    const internalCategories = [
      'transfers', 'internal transfer', 'loan payments', 
      'credit card payments', 'account transfers'
    ];
    
    return internalPatterns.some(pattern => desc.includes(pattern)) ||
           internalCategories.some(pattern => cat.includes(pattern));
  };

  // Filter transactions based on date, category filters, and internal transfer toggle
  const getFilteredTransactions = () => {
    return allTransactions.filter(transaction => {
      // Date filter
      const transactionDate = new Date(transaction.date);
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo) : null;
      
      if (fromDate && transactionDate < fromDate) return false;
      if (toDate && transactionDate > toDate) return false;
      
      // Category filter
      const category = transaction.category || 'Uncategorized';
      if (excludedCategories.includes(category)) return false;
      
      // Internal transfer filter
      if (excludeInternalTransfers && isInternalTransfer(transaction)) return false;
      
      return true;
    });
  };

  // Process data for savings analysis chart
  const getSavingsData = () => {
    const filteredTransactions = getFilteredTransactions(); // Use filtered transactions instead of allTransactions
    const monthlyData = new Map<string, { 
      month: string, 
      income: number, 
      spending: number, 
      savings: number, 
      savingsRate: number,
      internalTransfers: number
    }>();
    
    // Process filtered transactions that respect date range
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short' });
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { 
          month: monthLabel, 
          income: 0, 
          spending: 0, 
          savings: 0, 
          savingsRate: 0,
          internalTransfers: 0
        });
      }
      
      const data = monthlyData.get(monthKey)!;
      const isInternal = isInternalTransfer(transaction);
      
      // Since we're now using filtered transactions, internal transfer filtering
      // is already handled by getFilteredTransactions() if excludeInternalTransfers is true
      if (isInternal && !excludeInternalTransfers) {
        data.internalTransfers += Math.abs(transaction.credit);
      } else if (!isInternal) {
        // Only count non-internal transfers for actual income/spending
        if (transaction.credit > 0) {
          data.income += transaction.credit;
        } else {
          data.spending += Math.abs(transaction.credit);
        }
      }
    });

    // Calculate savings and rates
    monthlyData.forEach((data) => {
      data.savings = data.income - data.spending;
      data.savingsRate = data.income > 0 ? (data.savings / data.income) * 100 : 0;
    });

    return Array.from(monthlyData.entries())
      .map(([monthKey, data]) => ({ monthKey, ...data }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey)); // Sort by YYYY-MM format
  };
  const handleCategoryToggle = (categoryName: string) => {
    setExcludedCategories(prev => 
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };


  const getCategoryData = () => {
    const filteredTransactions = getFilteredTransactions();
    const categoryData = new Map<string, number>();
    
    filteredTransactions
      .filter(t => t.credit < 0) // Only debits
      .forEach(transaction => {
        const category = transaction.category || 'Uncategorized';
        categoryData.set(category, (categoryData.get(category) || 0) + Math.abs(transaction.credit));
      });

    return Array.from(categoryData.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categories
  };

  const clearFilters = () => {
    setExcludedCategories([]);
    setExcludeInternalTransfers(false);
    // Reset dates to default range
    if (allTransactions.length > 0) {
      const latestDate = new Date(Math.max(...allTransactions.map(t => new Date(t.date).getTime())));
      const twelveMonthsAgo = new Date(latestDate);
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      
      setDateFrom(twelveMonthsAgo.toISOString().split('T')[0]);
      setDateTo(latestDate.toISOString().split('T')[0]);
    }
  };

  // Colors for charts
  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

  const savingsData = getSavingsData();
  const filteredTransactions = getFilteredTransactions();
  const categoryData = getCategoryData();
  // Calculate current period savings metrics
  const currentPeriodIncome = filteredTransactions.filter(t => t.credit > 0).reduce((sum, t) => sum + t.credit, 0);
  const currentPeriodSpending = filteredTransactions.filter(t => t.credit < 0).reduce((sum, t) => sum + Math.abs(t.credit), 0);
  const currentPeriodSavings = currentPeriodIncome - currentPeriodSpending;
  const currentSavingsRate = currentPeriodIncome > 0 ? (currentPeriodSavings / currentPeriodIncome) * 100 : 0;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-6">
      {/* Chart Navigation with Filter Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-4 overflow-x-auto">
            <button
              onClick={() => setActiveChart('savings')}
              className={`flex items-center px-4 py-2 rounded-md whitespace-nowrap ${
                activeChart === 'savings'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-900 dark:border-white dark:border'
              }`}
            >
              <Target className="h-4 w-4 mr-2" />
              Savings Analysis
            </button>
            
            <button
              onClick={() => setActiveChart('categories')}
              className={`flex items-center px-4 py-2 rounded-md whitespace-nowrap ${
                activeChart === 'categories'
                  ? 'bg-blue-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-900 dark:border-white dark:border'
              }`}
            >
              <PieChartIcon className="h-4 w-4 mr-2" />
              Categories
            </button>
            
            <button
              onClick={() => setActiveChart('monthly')}
              className={`flex items-center px-4 py-2 rounded-md whitespace-nowrap ${
                activeChart === 'monthly'
                  ? 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-900 dark:border-white dark:border'
              }`}
            >
              <BarChartIcon className="h-4 w-4 mr-2" />
              Monthly Trends
            </button>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-3 py-2 rounded-md text-sm ${
              showFilters
                ? 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-900 dark:border-white dark:border'
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {(excludedCategories.length > 0 || dateFrom || dateTo || excludeInternalTransfers) && (
              <span className="ml-1 text-xs bg-red-500 text-white rounded-full px-1">
                {excludedCategories.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (excludeInternalTransfers ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="border-t pt-4 space-y-4">
            {/* Internal Transfers Toggle */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={excludeInternalTransfers}
                  onChange={(e) => setExcludeInternalTransfers(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-white">
                  Exclude Internal Transfers (Shows actual spending/income only)
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Filters out transfers between your accounts, credit card payments, loan payments, etc.
              </p>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-white">Date Range</label>
              <div className="flex gap-4 text-black dark:text-white">
                <DatePicker
                  selected={dateFrom ? new Date(dateFrom) : null}
                  onChange={(date: Date | null) =>
                    setDateFrom(date ? date.toISOString().split("T")[0] : "")
                  }
                  dateFormat="dd/MM/yyyy"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholderText="From date"
                />

                <DatePicker
                  selected={dateTo ? new Date(dateTo) : null}
                  onChange={(date: Date | null) =>
                    setDateTo(date ? date.toISOString().split("T")[0] : "")
                  }
                  dateFormat="dd/MM/yyyy"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholderText="To date"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-white">
                Exclude Categories ({excludedCategories.length} excluded)
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryToggle(category.name)}
                    className={`flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      excludedCategories.includes(category.name)
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-900 dark:text-white text-gray-700 border border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <div
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                    {excludedCategories.includes(category.name) && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-white"
              >
                Clear All Filters
              </button>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {filteredTransactions.length} of {allTransactions.length} transactions
                {excludeInternalTransfers && (
                  <span className="text-green-600 font-medium"> (transfers excluded)</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Savings Analysis Chart */}
      {activeChart === 'savings' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2 text-green-600" />
            Savings Rate Analysis
            {excludeInternalTransfers && (
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Transfers Excluded
              </span>
            )}
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={savingsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="amount" orientation="left" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="rate" orientation="right" tickFormatter={(value) => `${value.toFixed(0)}%`} />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'Savings Rate') return [`${value.toFixed(1)}%`, name];
                    return [formatCurrency(value), name];
                  }} 
                />
                <Legend />
                <Bar yAxisId="amount" dataKey="income" fill="#10B981" name="Income" />
                <Bar yAxisId="amount" dataKey="spending" fill="#EF4444" name="Spending" />
                <Bar yAxisId="amount" dataKey="savings" fill="#3B82F6" name="Net Savings" />
                <Line yAxisId="rate" type="monotone" dataKey="savingsRate" stroke="#F59E0B" strokeWidth={3} name="Savings Rate" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {/* Category Chart */}
      {activeChart === 'categories' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <PieChartIcon className="h-5 w-5 mr-2 text-blue-600" />
            Spending by Category
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(0) : 0}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Monthly Trends (existing chart) */}
      {activeChart === 'monthly' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <BarChartIcon className="h-5 w-5 mr-2 text-blue-600" />
            Monthly Trends
            {excludeInternalTransfers && (
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Transfers Excluded
              </span>
            )}
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={savingsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                <Legend />
                <Bar dataKey="income" fill="#10B981" name="Income" />
                <Bar dataKey="spending" fill="#EF4444" name="Spending" />
                <Bar dataKey="savings" fill="#3B82F6" name="Net Savings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Enhanced Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 ">
                {excludeInternalTransfers ? 'Actual Income' : 'Total Income'}
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(currentPeriodIncome)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <TrendingDown className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {excludeInternalTransfers ? 'Actual Spending' : 'Total Spending'}
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(currentPeriodSpending)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <Wallet className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Savings</p>
              <p className={`text-lg font-semibold ${currentPeriodSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(currentPeriodSavings)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <Target className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Savings Rate</p>
              <p className={`text-lg font-semibold ${currentSavingsRate >= 20 ? 'text-green-600' : currentSavingsRate >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                {currentSavingsRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Savings Rate Indicator */}
      {excludeInternalTransfers && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Savings Rate Health Check</h3>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className={`h-4 rounded-full transition-all duration-300 ${
                    currentSavingsRate >= 20 ? 'bg-green-500' : 
                    currentSavingsRate >= 10 ? 'bg-yellow-500' : 
                    'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(Math.max(currentSavingsRate, 0), 50)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                <span>0%</span>
                <span>10%</span>
                <span>20%</span>
                <span>30%+</span>
              </div>
            </div>
            <div className="ml-6 text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{currentSavingsRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentSavingsRate >= 20 ? 'Excellent!' : 
                 currentSavingsRate >= 10 ? 'Good progress' : 
                 'Room for improvement'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

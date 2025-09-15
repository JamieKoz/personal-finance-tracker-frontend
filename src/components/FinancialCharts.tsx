'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Line, Legend, ComposedChart, Area, AreaChart } from 'recharts';
import { PieChart as PieChartIcon, Filter, X, Wallet, TrendingDown, DollarSign, Target, ChevronDown, TrendingUp, Calendar, Activity } from 'lucide-react';
import { apiService } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Transaction } from '@/types/Transactions/transaction';
import { Category } from '@/types/Categories/category';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

export default function FinancialCharts() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('savings');
  const [excludeInternalTransfers, setExcludeInternalTransfers] = useState(false);
  
  // Filter states
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePickers, setShowDatePickers] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

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
    const cat = transaction.category?.toLowerCase() || '';
    
    const internalCategories = [
      'transfers', 'internal transfer'
    ];
    
    return internalCategories.some(pattern => cat.includes(pattern));
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
    const filteredTransactions = getFilteredTransactions();
    const monthlyData = new Map<string, { 
      month: string, 
      monthShort: string,
      income: number, 
      spending: number, 
      savings: number, 
      savingsRate: number,
      internalTransfers: number
    }>();
    
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short' });
      const monthShort = date.toLocaleDateString('en-GB', { month: 'short' });
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { 
          month: monthLabel, 
          monthShort: monthShort,
          income: 0, 
          spending: 0, 
          savings: 0, 
          savingsRate: 0,
          internalTransfers: 0
        });
      }
      
      const data = monthlyData.get(monthKey)!;
      const isInternal = isInternalTransfer(transaction);
      
      if (isInternal && !excludeInternalTransfers) {
        data.internalTransfers += Math.abs(transaction.credit);
      } else if (!isInternal) {
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
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  };

  // Get cumulative wealth data
  const getCumulativeWealthData = () => {
    const filteredTransactions = getFilteredTransactions()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let cumulativeBalance = 0;
    const dailyData = new Map<string, { date: string, balance: number, transactions: number }>();
    
    filteredTransactions.forEach(transaction => {
      const dateKey = transaction.date.split('T')[0];
      cumulativeBalance += transaction.credit;
      
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, { 
          date: dateKey, 
          balance: cumulativeBalance, 
          transactions: 0 
        });
      }
      
      const data = dailyData.get(dateKey)!;
      data.balance = cumulativeBalance;
      data.transactions++;
    });

    // Group by month for better visualization
    const monthlyBalances = new Map<string, { month: string, balance: number, avgDailyBalance: number }>();
    
    Array.from(dailyData.entries()).forEach(([dateKey, data]) => {
      const date = new Date(dateKey);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      
      if (!monthlyBalances.has(monthKey)) {
        monthlyBalances.set(monthKey, { 
          month: monthLabel, 
          balance: data.balance,
          avgDailyBalance: data.balance
        });
      } else {
        // Update to the last balance of the month
        monthlyBalances.get(monthKey)!.balance = data.balance;
      }
    });

    return Array.from(monthlyBalances.entries())
      .map(([monthKey, data]) => ({ monthKey, ...data }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  };

  // Get spending patterns data
  const getSpendingPatternsData = () => {
    const filteredTransactions = getFilteredTransactions()
      .filter(t => t.credit < 0); // Only expenses
    
    const weeklySpending = new Map<string, { week: string, weekday: number, weekend: number }>();
    
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const weekOfYear = getWeekNumber(date);
      const year = date.getFullYear();
      const weekKey = `${year}-W${weekOfYear}`;
      
      if (!weeklySpending.has(weekKey)) {
        weeklySpending.set(weekKey, { 
          week: `W${weekOfYear}`, 
          weekday: 0, 
          weekend: 0 
        });
      }
      
      const data = weeklySpending.get(weekKey)!;
      const dayOfWeek = date.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        data.weekend += Math.abs(transaction.credit);
      } else {
        data.weekday += Math.abs(transaction.credit);
      }
    });

    // Get last 12 weeks
    return Array.from(weeklySpending.entries())
      .map(([weekKey, data]) => ({ weekKey, ...data }))
      .sort((a, b) => b.weekKey.localeCompare(a.weekKey))
      .slice(0, 12)
      .reverse();
  };

  // Helper function to get week number
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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
      .filter(t => t.credit < 0)
      .forEach(transaction => {
        const category = transaction.category || 'Uncategorized';
        categoryData.set(category, (categoryData.get(category) || 0) + Math.abs(transaction.credit));
      });

    return Array.from(categoryData.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  };

  const clearFilters = () => {
    setExcludedCategories([]);
    setExcludeInternalTransfers(false);
    if (allTransactions.length > 0) {
      const latestDate = new Date(Math.max(...allTransactions.map(t => new Date(t.date).getTime())));
      const twelveMonthsAgo = new Date(latestDate);
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      
      setDateFrom(twelveMonthsAgo.toISOString().split('T')[0]);
      setDateTo(latestDate.toISOString().split('T')[0]);
    }
  };

  const getActiveFiltersCount = () => {
    return excludedCategories.length + 
           (dateFrom ? 1 : 0) + 
           (dateTo ? 1 : 0) + 
           (excludeInternalTransfers ? 1 : 0);
  };

  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];
  const savingsData = getSavingsData();
  const filteredTransactions = getFilteredTransactions();
  const categoryData = getCategoryData();
  const cumulativeWealthData = getCumulativeWealthData();
  const spendingPatternsData = getSpendingPatternsData();

  // Calculate current period savings metrics
  const currentPeriodIncome = filteredTransactions.filter(t => t.credit > 0).reduce((sum, t) => sum + t.credit, 0);
  const currentPeriodSpending = filteredTransactions.filter(t => t.credit < 0).reduce((sum, t) => sum + Math.abs(t.credit), 0);
  const currentPeriodSavings = currentPeriodIncome - currentPeriodSpending;
  const currentSavingsRate = currentPeriodIncome > 0 ? (currentPeriodSavings / currentPeriodIncome) * 100 : 0;

  // Calculate average monthly spending
  const monthsInPeriod = savingsData.length || 1;
  const avgMonthlySpending = currentPeriodSpending / monthsInPeriod;
  const avgMonthlyIncome = currentPeriodIncome / monthsInPeriod;
  const avgMonthlySavings = currentPeriodSavings / monthsInPeriod;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mb-6">
      {/* Chart Navigation with Filter Toggle - Updated Design */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col space-y-4">
          {/* Chart Navigation - Grid Layout for Mobile */}
          <div className="flex justify-between items-start">
            <div className="grid grid-cols-2 sm:flex sm:space-x-4 gap-2 sm:gap-0 flex-1">
              <button
                onClick={() => setActiveChart('savings')}
                className={`flex items-center justify-center px-3 py-2 rounded-md text-sm ${
                  activeChart === 'savings'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                }`}
              >
                <Target className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Savings Analysis</span>
                <span className="sm:hidden">Savings</span>
              </button>
              
              <button
                onClick={() => setActiveChart('wealth')}
                className={`flex items-center justify-center px-3 py-2 rounded-md text-sm ${
                  activeChart === 'wealth'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                }`}
              >
                <TrendingUp className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Wealth Trend</span>
                <span className="sm:hidden">Wealth</span>
              </button>
              
              <button
                onClick={() => setActiveChart('categories')}
                className={`flex items-center justify-center px-3 py-2 rounded-md text-sm ${
                  activeChart === 'categories'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                }`}
              >
                <PieChartIcon className="h-4 w-4 mr-1 sm:mr-2" />
                <span>Categories</span>
              </button>
              
              <button
                onClick={() => setActiveChart('patterns')}
                className={`flex items-center justify-center px-3 py-2 rounded-md text-sm ${
                  activeChart === 'patterns'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                }`}
              >
                <Activity className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Spending Patterns</span>
                <span className="sm:hidden">Patterns</span>
              </button>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-3 py-2 rounded-md text-sm ml-2 flex-shrink-0 ${
                showFilters
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
              }`}
            >
              <Filter className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Filters</span>
              {getActiveFiltersCount() > 0 && (
                <span className="ml-1 text-xs bg-red-500 text-white rounded-full px-1 min-w-[1.25rem] h-5 flex items-center justify-center">
                  {getActiveFiltersCount()}
                </span>
              )}
              <ChevronDown className={`h-4 w-4 ml-1 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="border-t pt-4 space-y-4">
              {/* Internal Transfers Toggle */}
              <div className="space-y-2">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={excludeInternalTransfers}
                    onChange={(e) => setExcludeInternalTransfers(e.target.checked)}
                    className="mr-2 mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-white">
                      Exclude Internal Transfers
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Hide transfers between accounts, credit card payments, etc.
                    </p>
                  </div>
                </label>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <button
                  onClick={() => setShowDatePickers(!showDatePickers)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-white">Date Range</span>
                  <div className="flex items-center">
                    {(dateFrom || dateTo) && (
                      <span className="text-xs text-blue-600 mr-2">
                        {dateFrom && dateTo ? `${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}` : 'Custom range'}
                      </span>
                    )}
                    <ChevronDown className={`h-4 w-4 transform transition-transform ${showDatePickers ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                
                {showDatePickers && (
                  <div className="space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">From Date</label>
                      <DatePicker
                        selected={dateFrom ? new Date(dateFrom) : null}
                        onChange={(date: Date | null) =>
                          setDateFrom(date ? date.toISOString().split("T")[0] : "")
                        }
                        dateFormat="dd/MM/yyyy"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholderText="Select start date"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">To Date</label>
                      <DatePicker
                        selected={dateTo ? new Date(dateTo) : null}
                        onChange={(date: Date | null) =>
                          setDateTo(date ? date.toISOString().split("T")[0] : "")
                        }
                        dateFormat="dd/MM/yyyy"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholderText="Select end date"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Category Filter */}
              {categories.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-white">
                      Exclude Categories
                    </span>
                    {excludedCategories.length > 0 && (
                      <span className="text-xs text-red-600">
                        {excludedCategories.length} excluded
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryToggle(category.name)}
                        className={`flex items-center px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          excludedCategories.includes(category.name)
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <div
                          className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="truncate">{category.name}</span>
                        {excludedCategories.includes(category.name) && (
                          <X className="h-3 w-3 ml-1 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white underline"
                >
                  Clear All Filters
                </button>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="block sm:inline">
                    Showing {filteredTransactions.length} of {allTransactions.length} transactions
                  </span>
                  {excludeInternalTransfers && (
                    <span className="text-green-600 font-medium block sm:inline sm:ml-1">
                      (transfers excluded)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Savings Analysis Chart */}
      {activeChart === 'savings' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center flex-wrap">
            <Target className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />
            <span>Savings Rate Analysis</span>
            {excludeInternalTransfers && (
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Transfers Excluded
              </span>
            )}
          </h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={savingsData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="monthShort" 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="amount" 
                  orientation="left" 
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} 
                  className="text-xs"
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  yAxisId="rate" 
                  orientation="right" 
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                  className="text-xs" 
                  tick={{ fontSize: 10 }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'Savings Rate') return [`${value.toFixed(1)}%`, name];
                    return [formatCurrency(value), name];
                  }}
                  contentStyle={{ fontSize: '14px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar yAxisId="amount" dataKey="income" fill="#10B981" name="Income" />
                <Bar yAxisId="amount" dataKey="spending" fill="#EF4444" name="Spending" />
                <Bar yAxisId="amount" dataKey="savings" fill="#3B82F6" name="Net Savings" />
                <Line yAxisId="rate" type="monotone" dataKey="savingsRate" stroke="#F59E0B" strokeWidth={2} name="Savings Rate" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Current Balance</p>
              <p className={`text-lg font-semibold ${cumulativeWealthData[cumulativeWealthData.length - 1]?.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(cumulativeWealthData[cumulativeWealthData.length - 1]?.balance || 0)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Period Change</p>
              <p className={`text-lg font-semibold ${currentPeriodSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {currentPeriodSavings >= 0 ? '+' : ''}{formatCurrency(currentPeriodSavings)}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Cumulative Wealth Trend Chart */}
      {activeChart === 'wealth' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center flex-wrap">
            <TrendingUp className="h-5 w-5 mr-2 text-purple-600 flex-shrink-0" />
            <span>Cumulative Wealth Trend</span>
            {excludeInternalTransfers && (
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Transfers Excluded
              </span>
            )}
          </h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeWealthData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  className="text-xs"
                  tick={{ fontSize: 10 }}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Balance']}
                  contentStyle={{ fontSize: '14px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#8B5CF6" 
                  fill="#8B5CF6" 
                  fillOpacity={0.3}
                  strokeWidth={2}
                  name="Net Worth" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Current Balance</p>
              <p className={`text-lg font-semibold ${cumulativeWealthData[cumulativeWealthData.length - 1]?.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(cumulativeWealthData[cumulativeWealthData.length - 1]?.balance || 0)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Period Change</p>
              <p className={`text-lg font-semibold ${currentPeriodSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {currentPeriodSavings >= 0 ? '+' : ''}{formatCurrency(currentPeriodSavings)}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeChart === 'categories' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <PieChartIcon className="h-5 w-5 mr-2 text-blue-600" />
            Spending by Category
          </h3>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Pie Chart */}
            <div className="flex-1">
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => {
                        const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;
                        return isMobile ? `${(percent ? (percent * 100).toFixed(0) : 0)}%` : `${name} (${percent ? (percent * 100).toFixed(0) : 0}%)`;
                      }}
                      outerRadius={typeof window !== 'undefined' && window.innerWidth > 640 ? 100 : 80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Amount']}
                      contentStyle={{ fontSize: '14px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Legend */}
            <div className="lg:w-80 lg:flex-shrink-0">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Category Breakdown</h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {categoryData.map((category, index) => {
                  const totalSpending = categoryData.reduce((sum, cat) => sum + cat.value, 0);
                  const percentage = totalSpending > 0 ? (category.value / totalSpending) * 100 : 0;

                  return (
                    <div key={category.name} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center min-w-0 flex-1">
                        <div
                          className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
                          style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        <span className="text-sm text-gray-900 dark:text-white truncate">
                          {category.name}
                        </span>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(category.value)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Spending</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(categoryData.reduce((sum, cat) => sum + cat.value, 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Categories shown</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {categoryData.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spending Patterns Chart */}
      {activeChart === 'patterns' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center flex-wrap">
            <Activity className="h-5 w-5 mr-2 text-orange-600 flex-shrink-0" />
            <span>Weekly Spending Patterns</span>
            {excludeInternalTransfers && (
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Transfers Excluded
              </span>
            )}
          </h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingPatternsData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="week"
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                  className="text-xs"
                  tick={{ fontSize: 10 }}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), '']}
                  contentStyle={{ fontSize: '14px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="weekday" stackId="a" fill="#3B82F6" name="Weekday" />
                <Bar dataKey="weekend" stackId="a" fill="#F59E0B" name="Weekend" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Daily</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatCurrency(currentPeriodSpending / Math.max(1, filteredTransactions.length))}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Weekly</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatCurrency((currentPeriodSpending / monthsInPeriod) / 4.33)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Monthly</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatCurrency(avgMonthlySpending)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Summary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-6">
          <div className="flex items-center">
            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
            <div className="ml-2 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {excludeInternalTransfers ? 'Actual Income' : 'Total Income'}
              </p>
              <p className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                {formatCurrency(currentPeriodIncome)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-6">
          <div className="flex items-center">
            <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 flex-shrink-0" />
            <div className="ml-2 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {excludeInternalTransfers ? 'Actual Spending' : 'Total Spending'}
              </p>
              <p className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                {formatCurrency(currentPeriodSpending)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-6">
          <div className="flex items-center">
            <Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
            <div className="ml-2 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Net Savings</p>
              <p className={`text-sm sm:text-lg font-semibold truncate ${currentPeriodSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(currentPeriodSavings)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-6">
          <div className="flex items-center">
            <Target className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 flex-shrink-0" />
            <div className="ml-2 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Savings Rate</p>
              <p className={`text-lg font-semibold ${currentSavingsRate >= 20 ? 'text-green-600' : currentSavingsRate >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                {currentSavingsRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Averages Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-indigo-600" />
          Monthly Averages
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-400">Income</span>
            <span className="text-lg font-semibold text-green-600">{formatCurrency(avgMonthlyIncome)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-400">Spending</span>
            <span className="text-lg font-semibold text-red-600">{formatCurrency(avgMonthlySpending)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-400">Savings</span>
            <span className={`text-lg font-semibold ${avgMonthlySavings >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(avgMonthlySavings)}
            </span>
          </div>
        </div>
        
        {/* Financial Health Score */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Financial Health Score</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentSavingsRate >= 20 ? 'A' : currentSavingsRate >= 15 ? 'B' : currentSavingsRate >= 10 ? 'C' : currentSavingsRate >= 5 ? 'D' : 'F'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                currentSavingsRate >= 20 ? 'bg-green-500' : 
                currentSavingsRate >= 15 ? 'bg-blue-500' :
                currentSavingsRate >= 10 ? 'bg-yellow-500' : 
                currentSavingsRate >= 5 ? 'bg-orange-500' :
                'bg-red-500'
              }`}
              style={{ width: `${Math.min(Math.max(currentSavingsRate * 2, 5), 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {currentSavingsRate >= 20 ? 'Excellent! You\'re building wealth effectively.' : 
             currentSavingsRate >= 15 ? 'Great job! Keep up the good savings habits.' :
             currentSavingsRate >= 10 ? 'Good progress. Consider increasing savings.' : 
             currentSavingsRate >= 5 ? 'Fair. Look for opportunities to reduce spending.' :
             'Needs improvement. Review your budget and spending habits.'}
          </p>
        </div>
      </div>
    </div>
  );
}

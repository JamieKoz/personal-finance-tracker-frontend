'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Calendar, TrendingUp, PieChart as PieChartIcon, BarChart as BarChartIcon, Filter, X } from 'lucide-react';
import { apiService } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Transaction, TransactionSummary, Category } from '@/types/transaction';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface ChartsProps {
  summary: TransactionSummary;
}

export default function FinancialCharts({ summary }: ChartsProps) {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('monthly');
  
  // Filter states
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

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

  // Filter transactions based on date and category filters
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
      
      return true;
    });
  };

  // Process data for monthly spending chart
  const getMonthlyData = () => {
    const filteredTransactions = getFilteredTransactions();
    const monthlyData = new Map<string, { month: string, credits: number, debits: number, net: number }>();
    
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short' });
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { month: monthLabel, credits: 0, debits: 0, net: 0 });
      }
      
      const data = monthlyData.get(monthKey)!;
      if (transaction.credit > 0) {
        data.credits += transaction.credit;
      } else {
        data.debits += Math.abs(transaction.credit);
      }
      data.net = data.credits - data.debits;
    });

    return Array.from(monthlyData.values())
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  // Process data for category spending
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

  // Process data for daily balance trend
  const getBalanceTrendData = () => {
    const filteredTransactions = getFilteredTransactions()
      .slice(-60) // Last 60 transactions for better trend visibility
      .map(transaction => ({
        date: new Date(transaction.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        balance: transaction.balance
      }));
    
    return filteredTransactions;
  };

  const handleCategoryToggle = (categoryName: string) => {
    setExcludedCategories(prev => 
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const clearFilters = () => {
    setExcludedCategories([]);
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

  const monthlyData = getMonthlyData();
  const categoryData = getCategoryData();
  const balanceData = getBalanceTrendData();
  const filteredTransactions = getFilteredTransactions();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
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
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-4 overflow-x-auto">
            <button
              onClick={() => setActiveChart('monthly')}
              className={`flex items-center px-4 py-2 rounded-md whitespace-nowrap ${
                activeChart === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BarChartIcon className="h-4 w-4 mr-2" />
              Monthly Trends
            </button>
            
            <button
              onClick={() => setActiveChart('categories')}
              className={`flex items-center px-4 py-2 rounded-md whitespace-nowrap ${
                activeChart === 'categories'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <PieChartIcon className="h-4 w-4 mr-2" />
              Categories
            </button>
            
            <button
              onClick={() => setActiveChart('balance')}
              className={`flex items-center px-4 py-2 rounded-md whitespace-nowrap ${
                activeChart === 'balance'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Balance Trend
            </button>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-3 py-2 rounded-md text-sm ${
              showFilters
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {(excludedCategories.length > 0 || dateFrom || dateTo) && (
              <span className="ml-1 text-xs bg-red-500 text-white rounded-full px-1">
                {excludedCategories.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="border-t pt-4 space-y-4">
            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="flex gap-4 text-black">
                <DatePicker
                  selected={dateFrom ? new Date(dateFrom) : null}
                  onChange={(date: Date | null) =>
                    setDateFrom(date ? date.toISOString().split("T")[0] : "")
                  }
                  dateFormat="dd/MM/yyyy"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />

                <DatePicker
                  selected={dateTo ? new Date(dateTo) : null}
                  onChange={(date: Date | null) =>
                    setDateTo(date ? date.toISOString().split("T")[0] : "")
                  }
                  dateFormat="dd/MM/yyyy"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
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
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear All Filters
              </button>
              <div className="text-sm text-gray-500">
                Showing {filteredTransactions.length} of {allTransactions.length} transactions
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      {activeChart === 'monthly' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChartIcon className="h-5 w-5 mr-2 text-blue-600" />
            Monthly Income vs Expenses
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                <Legend />
                <Bar dataKey="credits" fill="#10B981" name="Income" />
                <Bar dataKey="debits" fill="#EF4444" name="Expenses" />
                <Bar dataKey="net" fill="#3B82F6" name="Net" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeChart === 'categories' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
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
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
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

      {activeChart === 'balance' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            Account Balance Trend
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={balanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Balance']} />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Filtered Period</p>
              <p className="text-lg font-semibold text-gray-900">
                {dateFrom && dateTo 
                  ? `${new Date(dateFrom).toLocaleDateString('en-GB')} - ${new Date(dateTo).toLocaleDateString('en-GB')}` 
                  : 'All Time'
                }
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Filtered Total</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(filteredTransactions.reduce((sum, t) => sum + (t.credit > 0 ? t.credit : 0), 0))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <PieChartIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Categories</p>
              <p className="text-lg font-semibold text-gray-900">
                {categories.length - excludedCategories.length} of {categories.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

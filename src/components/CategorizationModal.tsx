'use client';

import { useState, useEffect } from 'react';
import { X, Tag, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { apiService } from '@/lib/api';
import { Transaction } from '@/types/Transactions/transaction';
import { Category } from '@/types/Categories/category';
import { CreateCategoryRequest } from '@/types/Requests/createCategoryRequest';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ToastSystem';

interface TransactionCategorizerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransactionCategorizer({ isOpen, onClose, onSuccess }: TransactionCategorizerProps) {
  const [uncategorizedTransactions, setUncategorizedTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const { showToast } = useToast(); 
  
  // New category form
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6B7280');

  const colorOptions = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E', '#6B7280'
  ];

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all uncategorized transactions
      const allTransactions = await fetchAllUncategorizedTransactions();
      setUncategorizedTransactions(allTransactions);
      
      // Fetch categories
      const categoriesData = await apiService.getCategories();
      setCategories(categoriesData);
      
      setCurrentIndex(0);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all uncategorized transactions across all pages
  const fetchAllUncategorizedTransactions = async (): Promise<Transaction[]> => {
    const allTransactions: Transaction[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await apiService.getTransactions(page, 100);
        const uncategorized = response.data.filter(t => 
          !t.category || t.category === 'Uncategorized' || !t.categoryId
        );
        
        allTransactions.push(...uncategorized);
        
        // Check if we need to fetch more pages
        hasMore = response.pagination.hasNextPage;
        page++;
        
        // Safety break to avoid infinite loops
        if (page > 1000) break;
      } catch (error) {
        console.error('Error fetching page', page, error);
        break;
      }
    }

    return allTransactions;
  };

 const handleCategorizeTransaction = async (categoryId: number, categoryName: string) => {
    const currentTransaction = uncategorizedTransactions[currentIndex];
    if (!currentTransaction) return;

    setCategorizing(true);
    try {
      const response = await apiService.categorizeWithPattern({
        transactionId: currentTransaction.id,
        categoryId: categoryId
      });

      // Use the hook that's declared at component level
      showToast(
        `Categorized ${response.updatedCount} transactions as "${categoryName}" using pattern "${response.businessName}"`,
        'success',
        5000
      );

      await fetchData();

      if (uncategorizedTransactions.length <= 1) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Failed to categorize transaction:', error);
      showToast('Failed to categorize transaction', 'error');
    } finally {
      setCategorizing(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setLoading(true);
    try {
      const newCategory: CreateCategoryRequest = {
        name: newCategoryName.trim(),
        color: newCategoryColor
      };
      
      const createdCategory = await apiService.createCategory(newCategory);
      setCategories([...categories, createdCategory]);
      setNewCategoryName('');
      setNewCategoryColor('#6B7280');
      setShowCreateCategory(false);
    } catch (error) {
      console.error('Failed to create category:', error);
      alert('Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex < uncategorizedTransactions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // Loop back to first
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(uncategorizedTransactions.length - 1); // Loop to last
    }
  };

  if (!isOpen) return null;

  const currentTransaction = uncategorizedTransactions[currentIndex];

  return (
    <div className="fixed inset-0 overflow-y-auto h-full w-full z-50">

      <div
        className="absolute inset-0 bg-gray-100 opacity-70"
      >
      </div>
      <div className="relative top-4 mx-auto p-8 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <Tag className="h-6 w-6 mr-2 text-blue-600" />
            Categorize Transactions
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-600">Loading transactions...</p>
          </div>
        ) : uncategorizedTransactions.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">All transactions categorized!</h3>
            <p className="mt-1 text-sm text-gray-500">
              No uncategorized transactions found.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Progress */}
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Transaction {currentIndex + 1} of {uncategorizedTransactions.length}</span>
              <div className="flex space-x-2">
                <button
                  onClick={handlePrevious}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleSkip}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Current Transaction */}
            {currentTransaction && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Date</label>
                    <p className="text-sm text-gray-900">{formatDate(currentTransaction.date)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Amount</label>
                    <p className={`text-sm font-medium ${currentTransaction.credit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(currentTransaction.credit)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <p className="text-sm text-gray-900">{currentTransaction.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Category Selection */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-medium text-gray-900">Select Category</h4>
                <button
                  onClick={() => setShowCreateCategory(!showCreateCategory)}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Category
                </button>
              </div>

              {/* Create New Category */}
              {showCreateCategory && (
                <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    />
                    
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Color</label>
                      <div className="flex flex-wrap gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            onClick={() => setNewCategoryColor(color)}
                            className={`w-6 h-6 rounded-full border-2 ${
                              newCategoryColor === color ? 'border-gray-800' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCreateCategory}
                        disabled={!newCategoryName.trim() || loading}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => setShowCreateCategory(false)}
                        className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Categories Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorizeTransaction(category.id, category.name)}
                    disabled={categorizing}
                    className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="flex items-center">
                      <div
                        className="w-4 h-4 rounded-full mr-2 flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {category.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {category.transactionCount} transactions
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
                disabled={categorizing}
              >
                Skip This Transaction
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            {categorizing && (
              <div className="text-center text-sm text-gray-600">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2" />
                Categorizing transaction...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Transaction } from '@/types/Transactions/transaction';
import { Category } from '@/types/Categories/category';
import { apiService } from '@/lib/api';
import { useToast } from '@/components/ToastSystem';
import { Edit3, Save, X } from 'lucide-react';

interface TransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onTransactionUpdated?: () => void;
}

export default function TransactionModal({ transaction, isOpen, onClose, onTransactionUpdated }: TransactionModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);
  const { showToast } = useToast();
  const hasInitializedCategory = useRef(false);

  useEffect(() => {
    if (isOpen && transaction) {
      fetchCategories();
      hasInitializedCategory.current = false;
    }
  }, [isOpen, transaction]);

  useEffect(() => {
    if (transaction && categories.length > 0 && !hasInitializedCategory.current) {
      const currentCategory = categories.find(cat => cat.name === transaction.category);
      setSelectedCategoryId(currentCategory?.id || null);
      hasInitializedCategory.current = true;
    }
  }, [transaction, categories]);

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      hasInitializedCategory.current = false;
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const data = await apiService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleCategoryUpdate = async () => {
    if (!transaction || !selectedCategoryId) return;

    setUpdating(true);
    try {
      await apiService.updateTransactionCategory(transaction.id, selectedCategoryId);
      
      const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
      showToast(
        `Transaction categorized as "${selectedCategory?.name}"`,
        'success'
      );
      
      setIsEditing(false);
      onTransactionUpdated?.();
    } catch (error) {
      console.error('Failed to update transaction category:', error);
      showToast('Failed to update category', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    // Reset to original category
    if (transaction && categories.length > 0) {
      const originalCategory = categories.find(cat => cat.name === transaction.category);
      setSelectedCategoryId(originalCategory?.id || null);
    }
    setIsEditing(false);
  };

  if (!isOpen || !transaction) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const currentCategory = categories.find(cat => cat.name === transaction.category);

  return (
    <div 
      className="fixed inset-0 overflow-y-auto h-full w-full z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="absolute inset-0 bg-gray-100 dark:bg-gray-900 opacity-70"
        onClick={handleBackdropClick}>
      </div>
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 z-10">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Transaction Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white">Date</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(transaction.date)}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white">Description</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{transaction.description}</p>
            </div>
            
            {/* Enhanced Category Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-white">Category</label>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    Edit
                  </button>
                )}
              </div>
              
              {!isEditing ? (
                <div className="flex items-center">
                  {currentCategory && (
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: currentCategory.color }}
                    />
                  )}
                  <p className="text-sm text-gray-900 dark:text-white">{transaction.category || 'Uncategorized'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategoryId(category.id)}
                        className={`w-full p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-900 dark:bg-gray-800 flex items-center ${
                          selectedCategoryId === category.id ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm text-gray-900 dark:text-white flex-1">{category.name}</span>
                        {selectedCategoryId === category.id && (
                          <div className="w-2 h-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCategoryUpdate}
                      disabled={updating || !selectedCategoryId}
                      className="flex items-center px-3 py-1 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white text-sm rounded-md disabled:opacity-50"
                    >
                      {updating ? (
                        <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent mr-1" />
                      ) : (
                        <Save className="h-3 w-3 mr-1" />
                      )}
                      Save
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={updating}
                      className="flex items-center px-3 py-1 bg-gray-300 text-gray-700 dark:text-white text-sm rounded-md hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-900"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white">Amount</label>
              <p className={`mt-1 text-sm font-medium ${transaction.credit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(transaction.credit)}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white">Balance After</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatCurrency(transaction.balance)}</p>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

import { Transaction } from '@/types/Transactions/transaction';
import { PagedResponse } from '@/types/Pagination/pagedResponse';
import { CategorizeRequest } from '@/types/Requests/categorizeRequest';
import { CreateCategoryRequest } from '@/types/Requests/createCategoryRequest';
import { Category } from '@/types/Categories/category';
import { TransactionFilters } from '@/types/Transactions/transactionFilters';
import { TransactionSummary } from '@/types/Transactions/transactionSummary';
import { CategorizeResponse } from '@/types/Responses/CategorizeResponse';
import { UploadResponse } from '@/types/Responses/UploadResponse';
import { UpdateCategoryResponse } from '@/types/Responses/UpdateCategoryResponse';

const API_BASE = 'http://127.0.0.1:8000'; // Update to match your .NET API port

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    // Token expired or invalid
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.reload(); // This will trigger the auth flow
    throw new Error('Authentication required');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  const contentType = response.headers.get('content-type');
  
  if (!contentType?.includes('application/json')) {
    return {} as T;
  }

  try {
    const text = await response.text();
    if (!text.trim()) {
      return {} as T;
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('JSON Parse Error:', error);
    throw new Error('Invalid JSON response from server');
  }
}

export const apiService = {
  async uploadCSV(file: File): Promise<UploadResponse> {
    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}/api/Transaction/upload-csv`, {
      method: "POST",
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });

    return handleResponse<UploadResponse>(response);
  },

  async getTransactions(
    page: number = 1, 
    pageSize: number = 50,
    filters?: TransactionFilters
  ): Promise<PagedResponse<Transaction>> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.sortField) {
      params.append('sortField', filters.sortField);
    }
    if (filters?.sortDirection) {
      params.append('sortDirection', filters.sortDirection);
    }
    if (filters?.category) {
      params.append('category', filters.category);
    }

    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/Transaction?${params}`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    return handleResponse<PagedResponse<Transaction>>(response);
  },

  async getTransactionSummary(excludeInternalTransfers: boolean = false): Promise<TransactionSummary> {
    try {
      const params = new URLSearchParams();
      if (excludeInternalTransfers) {
        params.append('excludeInternalTransfers', 'true');
      }

      const url = `${API_BASE}/api/Transaction/summary${params.toString() ? '?' + params.toString() : ''}`;
      console.log('Fetching summary with URL:', url);
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch(url, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      return handleResponse<TransactionSummary>(response);
    } catch (error) {
      console.error('Error in getTransactionSummary:', error);
      throw error;
    }
  },

  async getTransaction(id: number): Promise<Transaction> {
    try {
      const response = await fetch(`${API_BASE}/api/Transaction/${id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      return await handleResponse<Transaction>(response);
    } catch (error) {
      console.error('Get transaction error:', error);
      throw new Error(`Failed to fetch transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getCategories(): Promise<Category[]> {
    try {
      const response = await fetch(`${API_BASE}/api/Category`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      return await handleResponse<Category[]>(response);
    } catch (error) {
      console.error('Get categories error:', error);
      throw new Error(`Failed to fetch categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async createCategory(category: CreateCategoryRequest): Promise<Category> {
    try {
      const response = await fetch(`${API_BASE}/api/Category`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(category),
      });
      
      return await handleResponse<Category>(response);
    } catch (error) {
      console.error('Create category error:', error);
      throw new Error(`Failed to create category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async categorizeTransactions(request: CategorizeRequest): Promise<CategorizeResponse> {
    try {
      const response = await fetch(`${API_BASE}/api/Category/categorize`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(request),
      });
      
      return await handleResponse<CategorizeResponse>(response);
    } catch (error) {
      console.error('Categorize transactions error:', error);
      throw new Error(`Failed to categorize transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async categorizeWithPattern(request: { transactionId: number; categoryId: number }): Promise<CategorizeResponse> {
    try {
      const response = await fetch(`${API_BASE}/api/Category/categorize-with-pattern`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(request),
      });
      
      return await handleResponse<CategorizeResponse>(response);
    } catch (error) {
      console.error('Categorize with pattern error:', error);
      throw new Error(`Failed to categorize with pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async updateTransactionCategory(transactionId: number, categoryId: number): Promise<UpdateCategoryResponse> {
    try {
      const response = await fetch(`${API_BASE}/api/Transaction/${transactionId}/category`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ categoryId }),
      });
      
      return await handleResponse<UpdateCategoryResponse>(response);
    } catch (error) {
      console.error('Update transaction category error:', error);
      throw new Error(`Failed to update transaction category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};

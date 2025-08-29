export interface Transaction {
  id: number;
  date: string;
  description: string;
  credit: number;
  balance: number;
  category: string;
  categoryId?: number;
  importHash?: string;
}

export interface PaginationInfo {
  Page: number;  // Capital P to match C# backend
  PageSize: number;  // Capital P to match C# backend
  TotalItems: number;  // Capital T to match C# backend
  TotalPages: number;  // Capital T to match C# backend
  HasNextPage: boolean;  // Capital H to match C# backend
  HasPreviousPage: boolean;  // Capital H to match C# backend
}

export interface PagedResponse<T> {
  data: T[];  // lowercase to match actual API response
  pagination: PaginationInfo;  // lowercase to match actual API response
}

export interface PaginationInfo {
  page: number;  // lowercase to match actual API response
  pageSize: number;  // lowercase to match actual API response
  totalItems: number;  // lowercase to match actual API response
  totalPages: number;  // lowercase to match actual API response
  hasNextPage: boolean;  // lowercase to match actual API response
  hasPreviousPage: boolean;  // lowercase to match actual API response
}

export interface TransactionSummary {
  transactionCount: number;
  totalCredits: number;
  totalDebits: number;
  currentBalance: number;
  averageTransaction: number;
  uncategorizedCount: number;
  dateRange: {
    from: string;
    to: string;
  };
  categoryBreakdown: {
    category: string;
    count: number;
    total: number;
  }[];
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  transactionCount: number;
}

export interface CategorizeRequest {
  categoryId: number;
  descriptionPattern?: string;
  amountMin?: number;
  amountMax?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface TransactionFilters {
  search?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  category?: string;
}

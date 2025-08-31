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


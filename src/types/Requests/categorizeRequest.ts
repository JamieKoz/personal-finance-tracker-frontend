
export interface CategorizeRequest {
  categoryId: number;
  descriptionPattern?: string;
  amountMin?: number;
  amountMax?: number;
  dateFrom?: string;
  dateTo?: string;
}
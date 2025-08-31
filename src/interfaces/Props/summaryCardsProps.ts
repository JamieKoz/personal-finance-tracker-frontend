import { TransactionSummary } from "@/types/Transactions/transactionSummary";

export interface SummaryCardsProps {
  summary: TransactionSummary;
  uncategorizedCount: number;
  onCategorizeClick: () => void;
}
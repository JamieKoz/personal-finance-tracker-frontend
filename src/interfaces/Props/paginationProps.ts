import { PaginationInfo } from "@/types/Pagination/paginationInfo";

export interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}
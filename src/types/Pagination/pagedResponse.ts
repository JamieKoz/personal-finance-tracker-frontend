import { PaginationInfo } from "./paginationInfo";

export interface PagedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}
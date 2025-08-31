export interface PaginationInfo {
  page: number;  // lowercase to match actual API response
  pageSize: number;  // lowercase to match actual API response
  totalItems: number;  // lowercase to match actual API response
  totalPages: number;  // lowercase to match actual API response
  hasNextPage: boolean;  // lowercase to match actual API response
  hasPreviousPage: boolean;  // lowercase to match actual API response
}


// export interface PaginationInfo {
//   Page: number;  // Capital P to match C# backend
//   PageSize: number;  // Capital P to match C# backend
//   TotalItems: number;  // Capital T to match C# backend
//   TotalPages: number;  // Capital T to match C# backend
//   HasNextPage: boolean;  // Capital H to match C# backend
//   HasPreviousPage: boolean;  // Capital H to match C# backend
// }
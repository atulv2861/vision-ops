export interface ApiResponse {
  data: any[] | Record<string, unknown>;
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
  };
  error: boolean;
  success: boolean;
}

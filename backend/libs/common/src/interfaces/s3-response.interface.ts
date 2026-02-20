export interface S3Response {
  status: string;
  message?: string;
  data?: {
    url: string;
    name: string;
  };
}

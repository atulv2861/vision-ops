export interface IStorageService {
  upload(file: any, key: string): Promise<string>;
  delete(key: string): Promise<void>;
}

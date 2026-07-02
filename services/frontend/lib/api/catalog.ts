import { apiClient } from './client';

export interface CatalogAccessSettings {
  id?: string;
  userId?: string;
  includeAlfaresCatalog: boolean;
  includeCommunityCatalog: boolean;
  sourceApplication?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export const catalogApi = {
  async provisionAccess(sourceApplication = 'flipflop') {
    return apiClient.post<CatalogAccessSettings>('/catalog/access/provision', {
      sourceApplication,
    });
  },
};

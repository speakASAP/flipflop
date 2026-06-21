import { apiClient, ApiResponse } from './client';

export interface LeadContactRequest {
  email: string;
  message: string;
  marketingConsent: boolean;
}

export interface LeadContactResponse {
  leadId: string;
  status: string;
  confirmationSent: boolean;
}

export const leadsApi = {
  submitContact(payload: LeadContactRequest): Promise<ApiResponse<LeadContactResponse>> {
    return apiClient.post<LeadContactResponse>('/leads/contact', payload);
  },
};

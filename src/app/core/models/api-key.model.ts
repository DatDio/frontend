// ================= API KEY MODELS =================

export interface ApiKeyResponse {
  id: number;
  name: string;
  status: number;           
  createdAt: string;
  expiredAt?: string;
  lastUsedAt?: string;
}

export interface ApiKeyGeneratedResponse {
  keyMetadata: ApiKeyResponse;
  apiKey: string;            
  warning: string;
}

export interface CreateApiKeyRequest {
  name?: string;
}

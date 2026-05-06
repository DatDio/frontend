export interface ToolApiKeyProductSummary {
    id: number;
    name: string;
}

export interface ToolApiKey {
    id: number;
    name: string;
    prefix: string;
    status: ToolApiKeyStatus;
    description?: string;
    createdByAdminId?: number;
    lastUsedAt?: string;
    lastUsedIp?: string;
    createdAt: string;
    canRegTool?: boolean;
    canOauth2Tool?: boolean;
    canProductUpload?: boolean;
    canProductExpiredExport?: boolean;
    allowedProductIds?: number[];
    allowedProducts?: ToolApiKeyProductSummary[];
}

export interface ToolApiKeyCreate {
    name: string;
    description?: string;
    canRegTool?: boolean;
    canOauth2Tool?: boolean;
    canProductUpload?: boolean;
    canProductExpiredExport?: boolean;
    allowedProductIds?: number[];
}

export interface ToolApiKeyUpdate {
    name: string;
    description?: string;
    canRegTool?: boolean;
    canOauth2Tool?: boolean;
    canProductUpload?: boolean;
    canProductExpiredExport?: boolean;
    allowedProductIds?: number[];
}

export interface ToolApiKeyGenerated {
    metadata: ToolApiKey;
    apiKey: string;  // Plaintext key - only shown once!
}

export type ToolApiKeyStatus = number;  // 0 = ACTIVE, 1 = INACTIVE

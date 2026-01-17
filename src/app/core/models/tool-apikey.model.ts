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
}

export interface ToolApiKeyCreate {
    name: string;
    description?: string;
}

export interface ToolApiKeyGenerated {
    metadata: ToolApiKey;
    apiKey: string;  // Plaintext key - only shown once!
}

export type ToolApiKeyStatus = number;  // 0 = ACTIVE, 1 = INACTIVE

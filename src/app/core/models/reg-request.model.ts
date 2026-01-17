export interface RegRequest {
    id: number;
    requestNumber: string;
    userId?: number;
    userEmail?: string;
    status: RegRequestStatus;
    requestType: RegRequestType;
    quantity: number;
    successCount: number;
    failedCount: number;
    pricePerAccount: number;
    estimatedTotal: number;
    totalCharged: number;
    inputList?: string[];  // Original input data
    createdAt: string;
    completedAt?: string;
    results?: RegResult[];
}

export interface RegResult {
    id: number;
    inputLine: string;
    accountData?: string;
    status: RegResultStatus;
    errorMessage?: string;
    processedAt?: string;
}

export interface RegRequestCreate {
    requestType: RegRequestType;
    inputList: string[];
}

export interface RegRequestFilter {
    userId?: number;
    userEmail?: string;
    requestNumber?: string;
    status?: RegRequestStatus;
    createdFrom?: string;
    createdTo?: string;
    page?: number;
    limit?: number;
    sort?: string;
}

export type RegRequestStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type RegRequestType = 'USER_ONLY' | 'USER_PASS';
export type RegResultStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

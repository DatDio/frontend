export interface OAuth2Request {
    id: number;
    requestNumber: string;
    userId?: number;
    userEmail?: string;
    status: OAuth2RequestStatus;
    quantity: number;
    successCount: number;
    failedCount: number;
    pricePerAccount: number;
    estimatedTotal: number;
    totalCharged: number;
    inputList?: string[];  // Original input data
    createdAt: string;
    pickedAt?: string;      // Thời điểm bắt đầu xử lý (cho timer)
    completedAt?: string;
    results?: OAuth2Result[];
}

export interface OAuth2Result {
    id: number;
    inputLine: string;
    accountData?: string;  // email|pass|oauth2token|clientID
    status: OAuth2ResultStatus;
    errorMessage?: string;
    processedAt?: string;
}

export interface OAuth2RequestCreate {
    inputList: string[];  // ["email1|pass1", "email2|pass2"]
}

export interface OAuth2RequestFilter {
    userId?: number;
    userEmail?: string;
    requestNumber?: string;
    status?: OAuth2RequestStatus;
    createdFrom?: string;
    createdTo?: string;
    page?: number;
    limit?: number;
    sort?: string;
}

export type OAuth2RequestStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type OAuth2ResultStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

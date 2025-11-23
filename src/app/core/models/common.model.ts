export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errorCode?: string;
}

export interface PaginatedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}
export interface PageFilter {
    page?: number;
    limit?: number;
    sort?: string;
}

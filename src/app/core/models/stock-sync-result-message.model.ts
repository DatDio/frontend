export interface StockSyncResultMessage {
  providerId: number;
  providerName: string;
  updates: MappingStockUpdate[];
  syncedAt: string;
}

export interface MappingStockUpdate {
  mappingId: number;
  localProductId: number;
  externalProductId: string;
  externalProductName: string;
  lastSyncedStock: number;
  externalPrice: number;
}

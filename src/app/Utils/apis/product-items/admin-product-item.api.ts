import { CommonApi } from '../commom.api';

export class AdminProductItemApi {

  public static readonly BASE = CommonApi.ADMIN_CONTEXT_PATH + '/product-items';

  public static readonly SEARCH = AdminProductItemApi.BASE + '/search';
  public static readonly CREATE = AdminProductItemApi.BASE + '/create';

  public static readonly IMPORT_TXT = (productId: string | number) =>
    AdminProductItemApi.BASE + `/import/${productId}`;

  public static readonly DELETE = (id: number) =>
    AdminProductItemApi.BASE + `/${id}`;

  // Bulk operations
  public static readonly BULK_DELETE = (productId: string | number) =>
    AdminProductItemApi.BASE + `/bulk-delete/${productId}`;

  public static readonly EXPIRED = (productId: string | number) =>
    AdminProductItemApi.BASE + `/expired/${productId}`;
}

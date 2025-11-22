import { CommonApi } from '../commom.api';

export class AdminProductItemApi {

  public static readonly BASE = CommonApi.ADMIN_CONTEXT_PATH + '/product-items';

  public static readonly SEARCH = AdminProductItemApi.BASE + '/search';
  public static readonly CREATE = AdminProductItemApi.BASE + '/create';

  public static readonly IMPORT_TXT = (productId: string | number) =>
    AdminProductItemApi.BASE + `/import/${productId}`;

  public static readonly DELETE = AdminProductItemApi.BASE + '/delete';

}
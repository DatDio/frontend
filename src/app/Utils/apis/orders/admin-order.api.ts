import { CommonApi } from '../commom.api';

export class AdminOrderApi {

  public static readonly BASE = CommonApi.ADMIN_CONTEXT_PATH + '/orders';

  public static readonly SEARCH = AdminOrderApi.BASE + '/search';
  public static readonly CLEANUP_EXPIRED = AdminOrderApi.BASE + '/cleanup-expired';
  public static readonly CLEANUP_EXPIRED_STATUS = AdminOrderApi.CLEANUP_EXPIRED + '/status';

  public static readonly DELETE = (id: number | string) => AdminOrderApi.BASE + '/delete' + `/${id}`;

}

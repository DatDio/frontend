import { CommonApi } from '../commom.api';

export class AdminOrderApi {

  public static readonly BASE = CommonApi.ADMIN_CONTEXT_PATH + '/orders';

  public static readonly SEARCH = AdminOrderApi.BASE + '/search';

  public static readonly GET_BY_ID = (id: string | number) =>
    AdminOrderApi.BASE + `/${id}`;

  public static readonly DELETE = AdminOrderApi.BASE + '/delete';

}
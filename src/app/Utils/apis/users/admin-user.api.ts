import { CommonApi } from '../commom.api';

export class AdminUserApi {

  public static readonly BASE = CommonApi.ADMIN_CONTEXT_PATH + '/users';

  public static readonly SEARCH = AdminUserApi.BASE + '/search';
  public static readonly CREATE = AdminUserApi.BASE + '/create';

  public static readonly UPDATE = (id: string | number) =>
    AdminUserApi.BASE + `/update/${id}`;

  public static readonly GET_BY_ID = (id: string | number) =>
    AdminUserApi.BASE + `/${id}`;

  public static readonly DELETE = AdminUserApi.BASE + '/delete';

  public static readonly BULK_UPDATE_STATUS =
    AdminUserApi.BASE + '/bulk-update-status';

  public static readonly EXPORT =
    AdminUserApi.BASE + '/export';
}

import { CommonApi } from '../commom.api';

export class AdminCategoryApi {

  public static readonly BASE = CommonApi.ADMIN_CONTEXT_PATH + '/categories';

  public static readonly SEARCH = AdminCategoryApi.BASE + '/search';
  public static readonly CREATE = AdminCategoryApi.BASE + '/create';

  public static readonly UPDATE = (id: string | number) =>
    AdminCategoryApi.BASE + `/update/${id}`;

  public static readonly GET_BY_ID = (id: string | number) =>
    AdminCategoryApi.BASE + `/${id}`;

  public static readonly DELETE = (id: number) =>
    AdminCategoryApi.BASE + `/${id}`;

}
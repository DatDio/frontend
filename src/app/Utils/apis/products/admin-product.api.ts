import { CommonApi } from "../commom.api";

export class AdminProductApi {
    public static readonly BASE = CommonApi.ADMIN_CONTEXT_PATH + '/products';

    public static readonly LIST = AdminProductApi.BASE;

    public static readonly CREATE = AdminProductApi.BASE + '/create';
    
    public static readonly UPDATE = (id: number) =>
        AdminProductApi.BASE + `/${id}`;

    public static readonly GET_BY_ID = (id: number) =>
        AdminProductApi.BASE + `/${id}`;

    public static readonly DELETE = (id: number) =>
        AdminProductApi.BASE + `/${id}`;
}

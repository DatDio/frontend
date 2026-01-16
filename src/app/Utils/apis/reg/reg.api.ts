import { CommonApi } from '../commom.api';

export class RegApi {
    public static readonly BASE = CommonApi.CONTEXT_PATH + '/reg';

    public static readonly CREATE = RegApi.BASE;
    public static readonly LIST = RegApi.BASE;
    public static readonly GET_BY_ID = (id: number | string) => RegApi.BASE + `/${id}`;
    public static readonly CANCEL = (id: number | string) => RegApi.BASE + `/${id}`;
}

export class AdminRegApi {
    public static readonly BASE = CommonApi.ADMIN_CONTEXT_PATH + '/reg';

    public static readonly SEARCH = AdminRegApi.BASE + '/search';
    public static readonly GET_BY_ID = (id: number | string) => AdminRegApi.BASE + `/${id}`;
    public static readonly CLEANUP = AdminRegApi.BASE + '/cleanup';
    public static readonly RESET_STUCK = AdminRegApi.BASE + '/reset-stuck';
}

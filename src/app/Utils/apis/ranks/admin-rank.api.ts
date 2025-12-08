import { CommonApi } from '../commom.api';

export class AdminRankApi {

    public static readonly BASE = CommonApi.ADMIN_CONTEXT_PATH + '/ranks';

    public static readonly SEARCH = AdminRankApi.BASE;
    public static readonly CREATE = AdminRankApi.BASE + '/create';

    public static readonly UPDATE = (id: string | number) =>
        AdminRankApi.BASE + `/update/${id}`;

    public static readonly GET_BY_ID = (id: string | number) =>
        AdminRankApi.BASE + `/${id}`;

    public static readonly DELETE = (id: string | number) =>
        AdminRankApi.BASE + `/delete/${id}`;
}

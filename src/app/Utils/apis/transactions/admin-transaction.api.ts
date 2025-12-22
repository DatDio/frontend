import { CommonApi } from "../commom.api";

export class AdminTransactionApi {
    public static readonly BASE = CommonApi.ADMIN_CONTEXT_PATH + '/transactions';

    public static readonly SEARCH = AdminTransactionApi.BASE;

    public static readonly UPDATE_STATUS = (id: number | string) =>
        `${AdminTransactionApi.BASE}/${id}/status`;
}


import { CommonApi } from "../commom.api";

export class ClientUserApi {
    public static readonly BASE = CommonApi.CONTEXT_PATH + '/users';
    public static readonly GET_USER_BY_ID = (id: number | string) =>
        ClientUserApi.BASE + `/me`
    public static readonly UPDATE = (id: string | number) =>
        ClientUserApi.BASE + `/update/${id}`;
}
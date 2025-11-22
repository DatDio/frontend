import { CommonApi } from "../commom.api";

export class ClientUserApi {
    public static readonly BASE = CommonApi.CONTEXT_PATH + '/users';
    public static readonly GET_USER_BY_ID = (id: string) =>
        ClientUserApi.BASE + `/me`
}
import { CommonApi } from "../commom.api";

export class ApiKeyApi {
public static readonly BASE = CommonApi.CONTEXT_PATH + '/api-keys';
    public static readonly LIST =
        ApiKeyApi.BASE + '/list';
    public static readonly CREATE =
        ApiKeyApi.BASE + '/generate';

   public static readonly DELETE = (id: number) =>
        ApiKeyApi.BASE + `/${id}`;
}

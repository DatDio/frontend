import { CommonApi } from '../commom.api';

/**
 * Admin Tool API Key endpoints
 * Matches backend: /admin/tool-api-keys
 */
export class AdminToolApiKeyApi {
    public static readonly BASE = CommonApi.ADMIN_CONTEXT_PATH + '/tool-api-keys';

    public static readonly CREATE = AdminToolApiKeyApi.BASE;
    public static readonly LIST = AdminToolApiKeyApi.BASE;
    public static readonly GET_BY_ID = (id: number | string) => AdminToolApiKeyApi.BASE + `/${id}`;
    public static readonly REVOKE = (id: number | string) => AdminToolApiKeyApi.BASE + `/${id}/revoke`;
    public static readonly ACTIVATE = (id: number | string) => AdminToolApiKeyApi.BASE + `/${id}/activate`;
    public static readonly DELETE = (id: number | string) => AdminToolApiKeyApi.BASE + `/${id}`;
}

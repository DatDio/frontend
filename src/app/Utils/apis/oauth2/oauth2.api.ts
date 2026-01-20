import { CommonApi } from '../commom.api';

export class OAuth2Api {
    public static readonly BASE = CommonApi.CONTEXT_PATH + '/oauth2';

    public static readonly CREATE = OAuth2Api.BASE;
    public static readonly LIST = OAuth2Api.BASE;
    public static readonly MY_PENDING = OAuth2Api.BASE + '/my-pending';
    public static readonly GET_BY_ID = (id: number | string) => OAuth2Api.BASE + `/${id}`;
    public static readonly CANCEL = (id: number | string) => OAuth2Api.BASE + `/${id}`;
}

export class AdminOAuth2Api {
    public static readonly BASE = CommonApi.ADMIN_CONTEXT_PATH + '/oauth2';

    public static readonly SEARCH = AdminOAuth2Api.BASE + '/search';
    public static readonly GET_BY_ID = (id: number | string) => AdminOAuth2Api.BASE + `/${id}`;
}

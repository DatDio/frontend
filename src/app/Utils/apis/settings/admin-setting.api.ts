import { CommonApi } from '../commom.api';

export class AdminSettingApi {

    public static readonly BASE = CommonApi.ADMIN_CONTEXT_PATH + '/settings';

    public static readonly GET_ALL = AdminSettingApi.BASE;

    public static readonly GET_BY_KEY = (key: string) =>
        AdminSettingApi.BASE + `/${key}`;

    public static readonly UPDATE = (key: string) =>
        AdminSettingApi.BASE + `/${key}`;

    public static readonly CREATE = AdminSettingApi.BASE;

    public static readonly DELETE = (key: string) =>
        AdminSettingApi.BASE + `/${key}`;
}

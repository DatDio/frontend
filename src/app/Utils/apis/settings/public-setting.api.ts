import { CommonApi } from '../commom.api';

export class PublicSettingApi {
    public static readonly BASE = CommonApi.CONTEXT_PATH + '/settings';
    public static readonly GET_PUBLIC = PublicSettingApi.BASE + '/public';
    public static readonly GET_ANNOUNCEMENT_ACTIVE = PublicSettingApi.BASE + '/announcement/active';
}

import { CommonApi } from '../commom.api';

export class AdminAnnouncementApi {

    public static readonly BASE = CommonApi.ADMIN_CONTEXT_PATH + '/announcement';

    public static readonly GET = AdminAnnouncementApi.BASE;
    public static readonly SAVE = AdminAnnouncementApi.BASE;
    public static readonly TOGGLE = `${AdminAnnouncementApi.BASE}/toggle`;
}

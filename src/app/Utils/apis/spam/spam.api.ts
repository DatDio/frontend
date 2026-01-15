import { CommonApi } from '../commom.api';

export class SpamApi {

    public static readonly BASE = CommonApi.ADMIN_CONTEXT_PATH + '/spam';

    public static readonly BLOCKED_USERS = SpamApi.BASE + '/blocked-users';

    public static readonly UNBLOCK = SpamApi.BASE + '/unblock';
}

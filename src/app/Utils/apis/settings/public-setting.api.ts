import { environment } from '../../../../environments/environment';

const BASE = `${environment.apiUrl}/v1/settings`;

export const PublicSettingApi = {
    GET_PUBLIC: `${BASE}/public`,
};

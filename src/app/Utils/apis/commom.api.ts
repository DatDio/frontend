import { environment } from '../../../environments/environment';

export class CommonApi {
    public static readonly BASE_URL = environment.apiBaseUrl;
    public static readonly SERVICE_VERSION = '/api/v1';
    public static readonly CONTEXT_PATH = `${this.BASE_URL}${this.SERVICE_VERSION}`;
    public static readonly ADMIN_CONTEXT_PATH = `${this.BASE_URL}/admin${this.SERVICE_VERSION}`;
    public static readonly WS_URL = environment.wsUrl ?? `${this.BASE_URL}/ws`;
}

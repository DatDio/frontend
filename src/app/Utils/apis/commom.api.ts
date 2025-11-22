export class CommonApi {
    public static readonly BASE_URL = 'http://localhost:8080';
    public static readonly SERVICE_VERSION = '/api/v1';
    public static readonly CONTEXT_PATH = `${this.BASE_URL}${this.SERVICE_VERSION}`;

    public static readonly ADMIN_CONTEXT_PATH = this.BASE_URL.concat('/admin').concat(this.SERVICE_VERSION);
}

import { CommonApi } from "../commom.api";

export class ExternalApiProviderApi {
    public static readonly BASE = CommonApi.ADMIN_CONTEXT_PATH + '/external-api';

    // Providers
    public static readonly PROVIDERS = ExternalApiProviderApi.BASE + '/providers';
    public static readonly PROVIDERS_ACTIVE = ExternalApiProviderApi.PROVIDERS + '/active';

    public static readonly GET_PROVIDER = (id: number) =>
        ExternalApiProviderApi.PROVIDERS + `/${id}`;

    public static readonly TEST_CONNECTION = (id: number) =>
        ExternalApiProviderApi.PROVIDERS + `/${id}/test`;

    public static readonly FETCH_PRODUCTS = (id: number) =>
        ExternalApiProviderApi.PROVIDERS + `/${id}/products`;

    public static readonly FETCH_PRODUCTS_RAW = (id: number) =>
        ExternalApiProviderApi.PROVIDERS + `/${id}/products/raw`;

    public static readonly GET_BALANCE = (id: number) =>
        ExternalApiProviderApi.PROVIDERS + `/${id}/balance`;

    public static readonly PLACE_ORDER = (id: number) =>
        ExternalApiProviderApi.PROVIDERS + `/${id}/order`;

    // Mappings
    public static readonly MAPPINGS = ExternalApiProviderApi.BASE + '/mappings';

    public static readonly GET_MAPPING = (id: number) =>
        ExternalApiProviderApi.MAPPINGS + `/${id}`;

    public static readonly MAPPINGS_BY_PROVIDER = (providerId: number) =>
        ExternalApiProviderApi.MAPPINGS + `/by-provider/${providerId}`;

    public static readonly SYNC_STOCK = (providerId: number) =>
        ExternalApiProviderApi.MAPPINGS + `/sync/${providerId}`;
}

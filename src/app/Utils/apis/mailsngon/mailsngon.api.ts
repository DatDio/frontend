import { CommonApi } from "../commom.api";

export class MailsNgonApi {
    public static readonly BASE = CommonApi.ADMIN_CONTEXT_PATH + '/mailsngon';

    public static readonly SETTINGS = MailsNgonApi.BASE + '/settings';
    public static readonly TEST_CONNECTION = MailsNgonApi.SETTINGS + '/test';
    public static readonly BALANCE = MailsNgonApi.BASE + '/balance';
    public static readonly PRODUCTS = MailsNgonApi.BASE + '/products';

    public static readonly MAPPINGS = MailsNgonApi.BASE + '/mappings';
    public static readonly GET_MAPPING = (id: number) => MailsNgonApi.MAPPINGS + `/${id}`;
    public static readonly GET_MAPPING_BY_LOCAL_PRODUCT = (localProductId: number) =>
        MailsNgonApi.MAPPINGS + `/by-local-product/${localProductId}`;
    public static readonly SYNC_STOCK = MailsNgonApi.MAPPINGS + '/sync';
}

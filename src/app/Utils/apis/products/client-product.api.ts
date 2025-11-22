import { CommonApi } from "../commom.api";

export class ProductApi {
public static readonly BASE = CommonApi.CONTEXT_PATH + '/products';
    public static readonly SEARCH =
        ProductApi.BASE + '/search';

}

import { CommonApi } from "../commom.api";

export class OrderApi {
    public static readonly BASE = CommonApi.CONTEXT_PATH + '/orders';

    public static readonly CREATE = OrderApi.BASE + '/create';
    public static readonly GET_ORDER_BY_USER = OrderApi.BASE + `/my-orders`;
}

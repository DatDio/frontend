import { CommonApi } from "../commom.api";

export class OrderApi {
    public static readonly BASE = CommonApi.CONTEXT_PATH + '/orders';

    public static readonly SEARCH = OrderApi.BASE + '/my-orders';
    public static readonly BUY = OrderApi.BASE + '/buy';
    public static readonly GET_ORDER_BY_USER = OrderApi.BASE + `/my-orders`;

    public static readonly GET_BY_ID = (id: number | string) =>
    OrderApi.BASE + `/${id}`;
}

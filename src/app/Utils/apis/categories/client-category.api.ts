import { CommonApi } from "../commom.api";

export class CategoryApi {
public static readonly BASE = CommonApi.CONTEXT_PATH + '/categories';
    public static readonly CREATE = CategoryApi.BASE + '/create';

    public static readonly UPDATE = (id: number) =>
        CategoryApi.BASE + `/categories/${id}`;

    public static readonly GET_BY_ID = (id: number) =>
        CategoryApi.BASE + `/categories/${id}`;

    public static readonly SEARCH =
        CategoryApi.BASE + '/categories/search';
}

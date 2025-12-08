import { CommonApi } from "../commom.api";

export class ClientRankApi {
    public static readonly BASE = CommonApi.CONTEXT_PATH + '/ranks';
    public static readonly GET_ALL = ClientRankApi.BASE;
    public static readonly GET_MY_RANK = ClientRankApi.BASE + '/my-rank';
}

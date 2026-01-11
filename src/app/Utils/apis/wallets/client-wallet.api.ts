import { CommonApi } from "../commom.api";

export class WalletApi {
    public static readonly BASE = CommonApi.CONTEXT_PATH + '/wallets';
    public static readonly GET_MY_WALLET =
        WalletApi.BASE + '/me';

    public static readonly DEPOSIT_PAYOS =
        WalletApi.BASE + '/payos/deposit';

    public static readonly DEPOSIT_CASSO =
        WalletApi.BASE + '/casso/deposit';

    public static readonly DEPOSIT_FPAYMENT =
        WalletApi.BASE + '/fpayment/deposit';

    public static readonly TRANSACTOIN_SEARCH =
        WalletApi.BASE + '/transactions/search';
    public static GET_TRANSACTION = (transactionCode: string) =>
        `${WalletApi.BASE}/transactions/${transactionCode}`;

    public static readonly DELETE = (id: number) =>
        `${WalletApi.BASE}/transactions/delete/${id}`;
}


import { CommonApi } from './commom.api';

export class StatisticsApi {

    public static readonly BASE = CommonApi.ADMIN_CONTEXT_PATH + '/statistics';

    public static readonly OVERVIEW = StatisticsApi.BASE + '/overview';

    public static readonly REVENUE_CHART = StatisticsApi.BASE + '/revenue-chart';
}

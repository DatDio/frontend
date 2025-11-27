import { CommonApi } from "./commom.api";

export class AuthApi {
  public static readonly LOGIN = CommonApi.CONTEXT_PATH + '/auth/login';
  public static readonly REGISTER = CommonApi.CONTEXT_PATH + '/auth/register';
  public static readonly LOGOUT = CommonApi.CONTEXT_PATH + '/auth/logout';
  public static readonly REFRESH = CommonApi.CONTEXT_PATH + '/auth/refresh';
  public static readonly GOOGLE_LOGIN = CommonApi.CONTEXT_PATH + '/auth/google';
}

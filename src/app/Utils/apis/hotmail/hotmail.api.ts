import { CommonApi } from '../commom.api';

export const HotmailApi = {
    GET_CODE: `${CommonApi.CONTEXT_PATH}/hotmail/get-code`,
    CHECK_LIVE_MAIL: `${CommonApi.CONTEXT_PATH}/hotmail/check-live-mail`,
    GET_OAUTH2: `${CommonApi.CONTEXT_PATH}/hotmail/get-oauth2`
};

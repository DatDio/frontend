import { CommonApi } from '../commom.api';

export const HotmailApi = {
    GET_CODE: `${CommonApi.CONTEXT_PATH}/hotmail/get-code`,
    GET_CODE_START: `${CommonApi.CONTEXT_PATH}/hotmail/get-code/start`,
    GET_CODE_STREAM: `${CommonApi.CONTEXT_PATH}/hotmail/get-code/stream`,
    CHECK_LIVE_MAIL: `${CommonApi.CONTEXT_PATH}/hotmail/check-live-mail`,
    CHECK_LIVE_MAIL_START: `${CommonApi.CONTEXT_PATH}/hotmail/check-live-mail/start`,
    CHECK_LIVE_MAIL_STREAM: `${CommonApi.CONTEXT_PATH}/hotmail/check-live-mail/stream`,
    GET_OAUTH2: `${CommonApi.CONTEXT_PATH}/hotmail/get-oauth2`,
    GET_OAUTH2_START: `${CommonApi.CONTEXT_PATH}/hotmail/get-oauth2/start`,
    GET_OAUTH2_STREAM: `${CommonApi.CONTEXT_PATH}/hotmail/get-oauth2/stream`
};


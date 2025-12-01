declare module '@stomp/stompjs' {
  export type IMessage = any;
  export type IFrame = any;
  export type StompSubscription = any;

  export class Client {
    connected: boolean;
    active: boolean;
    onConnect?: (frame?: IFrame) => void;
    onStompError?: (frame: IFrame) => void;
    onWebSocketClose?: (evt: CloseEvent) => void;
    reconnectDelay?: number;
    constructor(config?: Record<string, any>);
    subscribe(destination: string, callback: (message: IMessage) => void): StompSubscription;
    activate(): void;
    deactivate(): void;
  }
}

declare module 'sockjs-client' {
  const SockJS: any;
  export default SockJS;
}

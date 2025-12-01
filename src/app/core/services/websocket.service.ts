import { Injectable, OnDestroy } from '@angular/core';
import { Client } from '@stomp/stompjs';
import type { IFrame, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { CommonApi } from '../../Utils/apis/commom.api';

type SubscriptionEntry<T> = {
  destination: string;
  handler: (payload: T) => void;
  subscription?: StompSubscription;
};

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {

  private client: Client;
  private readonly subscriptions: SubscriptionEntry<any>[] = [];

  constructor() {
    this.client = this.createClient();
    this.client.activate();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  subscribe<T>(destination: string, handler: (payload: T) => void): () => void {
    const entry: SubscriptionEntry<T> = { destination, handler };
    this.subscriptions.push(entry as SubscriptionEntry<any>);
    this.trySubscribe(entry as SubscriptionEntry<any>);
    return () => this.unsubscribe(entry as SubscriptionEntry<any>);
  }

  disconnect(): void {
    this.subscriptions.forEach(entry => entry.subscription?.unsubscribe());
    this.subscriptions.length = 0;

    if (this.client.active) {
      this.client.deactivate();
    }
  }

  private createClient(): Client {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${CommonApi.BASE_URL}/ws`),
      reconnectDelay: 5000
    });

    client.onConnect = () => {
      console.info('[WebSocket] Connected to', `${CommonApi.BASE_URL}/ws`);
      this.subscriptions.forEach(entry => this.resubscribe(entry));
    };

    client.onStompError = (frame: IFrame) => {
      console.error('[WebSocket] STOMP error:', frame.headers['message'], frame.body);
    };

    client.onWebSocketClose = (event: CloseEvent) => {
      console.warn('[WebSocket] Connection closed:', event.reason || event.code);
    };

    return client;
  }

  private trySubscribe(entry: SubscriptionEntry<any>): void {
    if (this.client.connected) {
      this.resubscribe(entry);
      return;
    }

    if (!this.client.active) {
      this.client.activate();
    }
  }

  private resubscribe(entry: SubscriptionEntry<any>): void {
    entry.subscription?.unsubscribe();

    entry.subscription = this.client.subscribe(entry.destination, (message: IMessage) => {
      const payload = this.safeParse(message.body);
      if (payload !== undefined) {
        entry.handler(payload);
      }
    });
  }

  private unsubscribe(entry: SubscriptionEntry<any>): void {
    const index = this.subscriptions.indexOf(entry);
    if (index >= 0) {
      entry.subscription?.unsubscribe();
      this.subscriptions.splice(index, 1);
    }

    if (this.subscriptions.length === 0 && this.client.active) {
      this.client.deactivate();
    }
  }

  private safeParse<T>(body: string): T | undefined {
    try {
      return JSON.parse(body) as T;
    } catch {
      return undefined;
    }
  }
}

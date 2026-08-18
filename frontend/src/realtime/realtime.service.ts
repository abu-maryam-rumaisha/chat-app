import { Client, type IMessage } from '@stomp/stompjs';
import { resolveWebSocketUrl } from '../api/api.ts';

export interface ConversationMessageEvent {
  conversationId: string;
  id: string;
  message: string;
  outgoing: boolean;
  recordAt: string;
  otherUserId: string;
}

export interface PresenceEvent {
  userId: string;
  online: boolean;
}

export interface TypingEvent {
  userId: string;
  typing: boolean;
}

/** The backend's `Long`/`BigInteger` id fields serialize as raw JSON numbers, not strings. */
interface RawConversationMessageEvent {
  conversationId: number;
  id: number;
  message: string;
  outgoing: boolean;
  recordAt: string;
  otherUserId: number;
}

interface RawPresenceEvent {
  userId: number;
  online: boolean;
}

interface RawTypingEvent {
  userId: number;
  typing: boolean;
}

function normalizeConversationMessageEvent(raw: RawConversationMessageEvent): ConversationMessageEvent {
  return {
    conversationId: String(raw.conversationId),
    id: String(raw.id),
    message: raw.message,
    outgoing: raw.outgoing,
    recordAt: raw.recordAt,
    otherUserId: String(raw.otherUserId),
  };
}

function normalizePresenceEvent(raw: RawPresenceEvent): PresenceEvent {
  return {
    userId: String(raw.userId),
    online: raw.online,
  };
}

function normalizeTypingEvent(raw: RawTypingEvent): TypingEvent {
  return {
    userId: String(raw.userId),
    typing: raw.typing,
  };
}

let client: Client | null = null;

export interface RealtimeHandlers {
  onMessage: (event: ConversationMessageEvent) => void;
  onPresence: (event: PresenceEvent) => void;
  onTyping: (event: TypingEvent) => void;
}

/**
 * Opens the STOMP-over-WebSocket connection and subscribes to this user's personal message queue
 * plus the shared presence topic. The handshake rides the same `_session_token` HttpOnly cookie
 * the REST API uses (the browser attaches it automatically since it's a same-origin request), so
 * no token needs to be passed explicitly here. Safe to call more than once — later calls are a
 * no-op while a connection is already active.
 */
export function connectRealtime(handlers: RealtimeHandlers): void {
  if (client) return;

  client = new Client({
    brokerURL: resolveWebSocketUrl('/ws'),
    reconnectDelay: 3000,
    onConnect: () => {
      client?.subscribe('/user/queue/conversations', (frame: IMessage) => {
        handlers.onMessage(normalizeConversationMessageEvent(JSON.parse(frame.body) as RawConversationMessageEvent));
      });
      client?.subscribe('/topic/presence', (frame: IMessage) => {
        handlers.onPresence(normalizePresenceEvent(JSON.parse(frame.body) as RawPresenceEvent));
      });
      client?.subscribe('/user/queue/typing', (frame: IMessage) => {
        handlers.onTyping(normalizeTypingEvent(JSON.parse(frame.body) as RawTypingEvent));
      });
    },
  });

  client.activate();
}

export function disconnectRealtime(): void {
  const current = client;
  client = null;
  void current?.deactivate();
}

/** Notifies `otherUserId` that the current user has started/stopped typing to them. A no-op while disconnected. */
export function sendTyping(otherUserId: string, typing: boolean): void {
  if (!client?.connected) return;

  client.publish({
    destination: '/app/typing',
    body: JSON.stringify({ otherUserId, typing }),
  });
}

import { API, apiFetch } from '../api/api.ts';

export interface DirectMessageConversation {
  id: string;
}

export interface Interlocutor {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  online: boolean;
}

export interface ConversationSummary {
  id: string;
  interlocutor: Interlocutor;
  lastMessage: string | null;
  lastMessageAt: string | null;
}

export interface ConversationSummaryPage {
  items: ConversationSummary[];
  hasMore: boolean;
}

export interface ConversationMessage {
  id: string;
  message: string;
  outgoing: boolean;
  recordAt: string;
}

export interface ConversationMessagePage {
  items: ConversationMessage[];
  hasMore: boolean;
}

interface ApiResponse<T> {
  payload?: T;
  message?: string;
}

interface DirectMessageResponsePayload {
  id: string;
}

interface GetConversationsResponsePayload {
  items: ConversationSummary[];
  hasMore: boolean;
}

interface GetConversationMessagesResponsePayload {
  items: ConversationMessage[];
  hasMore: boolean;
}

export interface FetchConversationsOptions {
  page?: number;
  size?: number;
  signal?: AbortSignal;
}

/** Lists the current user's conversations, most recently active first. */
export async function fetchConversations(options: FetchConversationsOptions = {}): Promise<ConversationSummaryPage> {
  const { page = 0, size = 20, signal } = options;

  const url = new URL(API.conversation.base, window.location.origin);
  url.searchParams.set('page', String(page));
  url.searchParams.set('size', String(size));

  const response = await apiFetch(url, {
    method: 'GET',
    credentials: 'include',
    signal,
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<GetConversationsResponsePayload> | null;

  if (!response.ok) {
    throw new Error(body?.message ?? 'Failed to load conversations');
  }

  return {
    items: body?.payload?.items ?? [],
    hasMore: body?.payload?.hasMore ?? false,
  };
}

export interface FetchConversationMessagesOptions {
  page?: number;
  size?: number;
  signal?: AbortSignal;
}

/** Lists a conversation's messages, oldest first. */
export async function fetchConversationMessages(
  conversationId: string,
  options: FetchConversationMessagesOptions = {},
): Promise<ConversationMessagePage> {
  const { page = 0, size = 30, signal } = options;

  const url = new URL(`${API.conversation.base}/${conversationId}/messages`, window.location.origin);
  url.searchParams.set('page', String(page));
  url.searchParams.set('size', String(size));

  const response = await apiFetch(url, {
    method: 'GET',
    credentials: 'include',
    signal,
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<GetConversationMessagesResponsePayload> | null;

  if (!response.ok) {
    throw new Error(body?.message ?? 'Failed to load messages');
  }

  return {
    items: body?.payload?.items ?? [],
    hasMore: body?.payload?.hasMore ?? false,
  };
}

/** Looks up an existing direct-message conversation with `userId`, without creating one. */
export async function findDirectMessageConversation(userId: string): Promise<DirectMessageConversation | null> {
  const url = new URL(API.conversation.direct, window.location.origin);
  url.searchParams.set('userId', userId);

  const response = await apiFetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<DirectMessageResponsePayload> | null;

  if (!response.ok) {
    throw new Error(body?.message ?? 'Failed to look up conversation');
  }

  return body?.payload ? { id: body.payload.id } : null;
}

/** Finds or creates the direct-message conversation with `userId`, and stores `message` in it. */
export async function createDirectMessageConversation(userId: string, message: string): Promise<DirectMessageConversation> {
  const response = await apiFetch(API.conversation.direct, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, message }),
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<DirectMessageResponsePayload> | null;

  if (!response.ok) {
    throw new Error(body?.message ?? 'Failed to start conversation');
  }

  if (!body?.payload) {
    throw new Error('Failed to start conversation');
  }

  return { id: body.payload.id };
}

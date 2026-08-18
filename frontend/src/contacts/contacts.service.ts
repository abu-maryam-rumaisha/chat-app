import { API, apiFetch } from '../api/api.ts';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  online: boolean;
}

export interface ContactsPage {
  items: Contact[];
  hasMore: boolean;
}

interface ApiResponse<T> {
  payload?: T;
  message?: string;
}

interface GetContactsResponsePayload {
  items: Contact[];
  hasMore: boolean;
}

export interface FetchContactsOptions {
  search?: string;
  page?: number;
  size?: number;
  signal?: AbortSignal;
}

export async function fetchContacts(options: FetchContactsOptions = {}): Promise<ContactsPage> {
  const { search = '', page = 0, size = 20, signal } = options;

  const url = new URL(API.user.contacts, window.location.origin);
  if (search) {
    url.searchParams.set('search', search);
  }
  url.searchParams.set('page', String(page));
  url.searchParams.set('size', String(size));

  const response = await apiFetch(url, {
    method: 'GET',
    credentials: 'include',
    signal,
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<GetContactsResponsePayload> | null;

  if (!response.ok) {
    throw new Error(body?.message ?? 'Failed to load contacts');
  }

  return {
    items: body?.payload?.items ?? [],
    hasMore: body?.payload?.hasMore ?? false,
  };
}

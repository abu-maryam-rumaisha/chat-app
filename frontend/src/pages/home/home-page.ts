import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { LocalizeController, getLocale, interpolate } from '../../i18n/i18n';
import { logout } from '../../auth/auth.service.ts';
import { navigate } from '../../router/navigate.ts';
import { fetchContacts, type Contact } from '../../contacts/contacts.service.ts';
import {
  createDirectMessageConversation,
  fetchConversationMessages,
  fetchConversations,
  findDirectMessageConversation,
  type ConversationMessage,
  type ConversationSummary,
} from '../../contacts/conversations.service.ts';
import {
  connectRealtime,
  disconnectRealtime,
  sendTyping,
  type ConversationMessageEvent,
  type PresenceEvent,
  type TypingEvent,
} from '../../realtime/realtime.service.ts';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/avatar/avatar.js';
import '@awesome.me/webawesome/dist/components/dialog/dialog.js';
import '@awesome.me/webawesome/dist/components/spinner/spinner.js';

interface ChatSummary {
  id: string;
  otherUserId: string;
  name: string;
  initials: string;
  gradient: string;
  preview: string | null;
  time: string;
  online: boolean;
}

interface DirectoryContact {
  id: string;
  name: string;
  initials: string;
  gradient: string;
  subtitle: string;
  online: boolean;
}

interface ActiveChat {
  id: string;
  otherUserId: string;
  name: string;
  initials: string;
  gradient: string;
  subtitle: string | null;
  online: boolean;
}

interface ThreadMessage {
  id: string;
  text: string;
  outgoing: boolean;
  date: Date;
  time: string;
  status: 'sent' | 'delivered' | 'read';
}

type MobileScreen = 'list' | 'search' | 'conversation';

const CONTACTS_PAGE_SIZE = 20;
const CONTACTS_SEARCH_DEBOUNCE_MS = 300;
const CHATS_PAGE_SIZE = 20;
/** How long a keystroke-free composer keeps broadcasting "typing" before we tell the other side to stop. */
const TYPING_STOP_DELAY_MS = 2000;
/** Defensive auto-clear for the remote indicator, in case the sender's "stopped typing" event never arrives. */
const TYPING_INDICATOR_TIMEOUT_MS = 5000;

const AVATAR_GRADIENTS: readonly string[] = [
  'linear-gradient(135deg, #4f46e5, #818cf8)',
  'linear-gradient(135deg, #e11d48, #fb7185)',
  'linear-gradient(135deg, #059669, #34d399)',
  'linear-gradient(135deg, #f59e0b, #fb7185)',
  'linear-gradient(135deg, #4f46e5, #34d399)',
  'linear-gradient(135deg, #e11d48, #4f46e5)',
  'linear-gradient(135deg, #059669, #4f46e5)',
  'linear-gradient(135deg, #4f46e5, #059669)',
];

function gradientForContact(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

function initialsForContact(firstName: string, lastName: string | null): string {
  const initials = `${firstName.trim().charAt(0)}${(lastName ?? '').trim().charAt(0)}`.toUpperCase();
  return initials || '?';
}

function toDirectoryContact(contact: Contact): DirectoryContact {
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() || contact.email;
  return {
    id: contact.id,
    name,
    initials: initialsForContact(contact.firstName, contact.lastName),
    gradient: gradientForContact(contact.id),
    subtitle: contact.email,
    online: contact.online,
  };
}

const ISO_TIMESTAMP_PATTERN = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?([zZ]|[+-]\d{2}:?\d{2})?$/;

/**
 * The backend records `recordAt`/`lastMessageAt` as a `LocalDateTime` in UTC, which Jackson
 * serializes without a `Z`/offset suffix (e.g. `2026-08-18T10:23:45.123456`). `new Date(...)`
 * would otherwise treat that as wall-clock time in the browser's own timezone rather than UTC,
 * shifting every timestamp by the viewer's UTC offset. Normalize the fractional seconds to
 * milliseconds (JS `Date` only supports millisecond precision) and assume UTC when no zone is
 * present so the result converts correctly to the viewer's local timezone.
 */
function parseServerTimestamp(iso: string): Date {
  const match = ISO_TIMESTAMP_PATTERN.exec(iso);
  if (!match) return new Date(iso);

  const [, base, fraction, zone] = match;
  const millis = fraction ? `.${fraction.slice(1, 4).padEnd(3, '0')}` : '';
  return new Date(`${base}${millis}${zone ?? 'Z'}`);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatChatTimestamp(iso: string | null): string {
  if (!iso) return '';
  const date = parseServerTimestamp(iso);
  const now = new Date();
  return isSameDay(date, now)
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function toChatSummary(conversation: ConversationSummary): ChatSummary {
  const { interlocutor } = conversation;
  const name = [interlocutor.firstName, interlocutor.lastName].filter(Boolean).join(' ').trim() || interlocutor.email;
  return {
    id: conversation.id,
    otherUserId: interlocutor.id,
    name,
    initials: initialsForContact(interlocutor.firstName, interlocutor.lastName),
    gradient: gradientForContact(interlocutor.id),
    preview: conversation.lastMessage,
    time: formatChatTimestamp(conversation.lastMessageAt),
    online: interlocutor.online,
  };
}

function toThreadMessage(message: ConversationMessage): ThreadMessage {
  const date = parseServerTimestamp(message.recordAt);
  return {
    id: `remote-${message.id}`,
    text: message.message,
    outgoing: message.outgoing,
    date,
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'sent',
  };
}

@customElement('home-page')
export class HomePage extends LitElement {
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private readonly localize = new LocalizeController(this);

  @state()
  private searchQuery = '';

  @state()
  private newChatQuery = '';

  @state()
  private selectedChat: ChatSummary | null = null;

  @state()
  private newChatContact: DirectoryContact | null = null;

  @state()
  private isNewChatOpen = false;

  @state()
  private contacts: DirectoryContact[] = [];

  @state()
  private isContactsLoading = false;

  @state()
  private isContactsLoadingMore = false;

  @state()
  private contactsError: string | null = null;

  @state()
  private chats: ChatSummary[] = [];

  @state()
  private isChatsLoading = false;

  @state()
  private isChatsLoadingMore = false;

  @state()
  private chatsError: string | null = null;

  @state()
  private activeConversationId: string | null = null;

  @state()
  private startConversationError: string | null = null;

  private startConversationRequestId = 0;

  @state()
  private messagesByConversation: Record<string, ThreadMessage[]> = {};

  @state()
  private isMessagesLoading = false;

  @state()
  private messagesError: string | null = null;

  private messagesRequestId = 0;

  @state()
  private sentMessages: Record<string, ThreadMessage[]> = {};

  @state()
  private messageDraft = '';

  @state()
  private isLoggingOut = false;

  @state()
  private logoutError: string | null = null;

  @state()
  private presenceByUserId: Record<string, boolean> = {};

  @state()
  private typingByUserId: Record<string, boolean> = {};

  private typingClearTimers: Record<string, ReturnType<typeof setTimeout>> = {};

  /** Whether we've told the other side "typing" for the currently active chat, so we know when to send "stopped". */
  private isTypingSent = false;
  private typingStopTimer?: ReturnType<typeof setTimeout>;

  private contactsPage = 0;
  private contactsHasMore = true;
  private contactsRequestId = 0;
  private searchDebounceTimer?: ReturnType<typeof setTimeout>;

  private chatsPage = 0;
  private chatsHasMore = true;
  private chatsRequestId = 0;

  connectedCallback(): void {
    super.connectedCallback();
    void this.loadConversations(true);
    connectRealtime({
      onMessage: this.handleRealtimeMessage,
      onPresence: this.handlePresenceEvent,
      onTyping: this.handleTypingEvent,
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this.searchDebounceTimer);
    clearTimeout(this.typingStopTimer);
    Object.values(this.typingClearTimers).forEach(clearTimeout);
    disconnectRealtime();
  }

  /**
   * Pushed by the backend the moment either participant sends a message. Appends it to the open
   * thread when it's for the currently active conversation, and always refreshes the chat list so
   * previews/ordering stay current even for conversations that aren't open.
   */
  private readonly handleRealtimeMessage = (event: ConversationMessageEvent): void => {
    const chat = this.activeChat;
    const isActiveConversation =
      chat != null &&
      (String(chat.id) === event.conversationId ||
        (this.activeConversationId == null && String(chat.id) === event.otherUserId));

    if (isActiveConversation && !event.outgoing) {
      this.activeConversationId = event.conversationId;

      const existingThread = this.messagesByConversation[event.conversationId];
      if (existingThread) {
        const date = parseServerTimestamp(event.recordAt);
        const message: ThreadMessage = {
          id: `remote-${event.id}`,
          text: event.message,
          outgoing: false,
          date,
          time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sent',
        };

        this.messagesByConversation = {
          ...this.messagesByConversation,
          [event.conversationId]: [...existingThread, message],
        };
      } else {
        // No history fetched for this conversation yet (e.g. its first-ever message just arrived
        // while this thread was open but empty) — fetch it properly rather than seeding the cache
        // with only this one message, which would make loadMessages' cache-guard skip the real fetch.
        void this.loadMessages(event.conversationId);
      }
    }

    void this.loadConversations(true);
  };

  private readonly handlePresenceEvent = (event: PresenceEvent): void => {
    this.presenceByUserId = { ...this.presenceByUserId, [event.userId]: event.online };
  };

  /**
   * Pushed by the backend whenever the other participant starts/stops typing to us. A "stopped"
   * event clears the indicator immediately; a "started" event also arms a fallback timer so the
   * indicator doesn't get stuck on forever if that user's "stopped" event never arrives (e.g. they
   * lost connection mid-type).
   */
  private readonly handleTypingEvent = (event: TypingEvent): void => {
    clearTimeout(this.typingClearTimers[event.userId]);
    delete this.typingClearTimers[event.userId];

    this.typingByUserId = { ...this.typingByUserId, [event.userId]: event.typing };

    if (event.typing) {
      this.typingClearTimers[event.userId] = setTimeout(() => {
        this.typingByUserId = { ...this.typingByUserId, [event.userId]: false };
      }, TYPING_INDICATOR_TIMEOUT_MS);
    }
  };

  private async loadConversations(reset: boolean): Promise<void> {
    if (reset) {
      this.chatsPage = 0;
      this.chatsHasMore = true;
      this.chatsError = null;
    }

    if (!this.chatsHasMore || this.isChatsLoading || this.isChatsLoadingMore) {
      return;
    }

    const requestId = ++this.chatsRequestId;
    if (reset) {
      this.isChatsLoading = true;
    } else {
      this.isChatsLoadingMore = true;
    }

    try {
      const result = await fetchConversations({ page: this.chatsPage, size: CHATS_PAGE_SIZE });

      if (requestId !== this.chatsRequestId) return;

      const mapped = result.items.map(toChatSummary);
      this.chats = reset ? mapped : [...this.chats, ...mapped];
      this.chatsHasMore = result.hasMore;
      this.chatsPage += 1;
    } catch (error) {
      if (requestId !== this.chatsRequestId) return;
      this.chatsError = error instanceof Error ? error.message : 'Failed to load chats';
    } finally {
      if (requestId === this.chatsRequestId) {
        this.isChatsLoading = false;
        this.isChatsLoadingMore = false;
      }
    }
  }

  private handleChatsScroll(event: Event): void {
    const el = event.currentTarget as HTMLElement;

    const scrollRemaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (scrollRemaining <= 120) {
      void this.loadConversations(false);
    }
  }

  private async loadMessages(conversationId: string): Promise<void> {
    if (this.messagesByConversation[conversationId]) return;

    const requestId = ++this.messagesRequestId;
    this.isMessagesLoading = true;
    this.messagesError = null;

    try {
      const result = await fetchConversationMessages(conversationId);
      if (requestId !== this.messagesRequestId) return;

      this.messagesByConversation = {
        ...this.messagesByConversation,
        [conversationId]: result.items.map(toThreadMessage),
      };
    } catch (error) {
      if (requestId !== this.messagesRequestId) return;
      this.messagesError = error instanceof Error ? error.message : 'Failed to load messages';
    } finally {
      if (requestId === this.messagesRequestId) {
        this.isMessagesLoading = false;
      }
    }
  }

  private async loadContacts(reset: boolean): Promise<void> {
    if (reset) {
      this.contactsPage = 0;
      this.contactsHasMore = true;
      this.contacts = [];
      this.contactsError = null;
    }

    if (!this.contactsHasMore || this.isContactsLoading || this.isContactsLoadingMore) {
      return;
    }

    const requestId = ++this.contactsRequestId;
    if (reset) {
      this.isContactsLoading = true;
    } else {
      this.isContactsLoadingMore = true;
    }

    try {
      const result = await fetchContacts({
        search: this.newChatQuery.trim(),
        page: this.contactsPage,
        size: CONTACTS_PAGE_SIZE,
      });

      if (requestId !== this.contactsRequestId) return;

      const mapped = result.items.map(toDirectoryContact);
      this.contacts = reset ? mapped : [...this.contacts, ...mapped];
      this.contactsHasMore = result.hasMore;
      this.contactsPage += 1;
    } catch (error) {
      if (requestId !== this.contactsRequestId) return;
      this.contactsError = error instanceof Error ? error.message : 'Failed to load contacts';
    } finally {
      if (requestId === this.contactsRequestId) {
        this.isContactsLoading = false;
        this.isContactsLoadingMore = false;
      }
    }
  }

  private handleContactsScroll(event: Event): void {
    const el = event.currentTarget as HTMLElement;

    const scrollRemaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (scrollRemaining <= 120) {
      void this.loadContacts(false);
    }
  }

  private handleSearchInput(event: Event): void {
    const input = event.currentTarget as HTMLElementTagNameMap['wa-input'];
    this.searchQuery = input.value ?? '';
  }

  private handleNewChatSearchInput(event: Event): void {
    const input = event.currentTarget as HTMLElementTagNameMap['wa-input'];
    this.newChatQuery = input.value ?? '';

    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      void this.loadContacts(true);
    }, CONTACTS_SEARCH_DEBOUNCE_MS);
  }

  private handleSelectChat(chat: ChatSummary): void {
    this.stopTyping();
    this.selectedChat = chat;
    this.newChatContact = null;
    this.activeConversationId = null;
    this.startConversationError = null;
    this.messageDraft = '';
    void this.loadMessages(chat.id);
  }

  private handleBackToList(): void {
    this.stopTyping();
    this.selectedChat = null;
    this.newChatContact = null;
    this.activeConversationId = null;
    this.startConversationError = null;
    this.messageDraft = '';
  }

  private openNewChat(): void {
    this.newChatQuery = '';
    this.isNewChatOpen = true;
    void this.loadContacts(true);
  }

  private closeNewChat(): void {
    this.isNewChatOpen = false;
  }

  private async handleLogout(): Promise<void> {
    if (this.isLoggingOut) return;

    this.isLoggingOut = true;
    this.logoutError = null;

    try {
      await logout();
      navigate('/');
    } catch (error) {
      this.logoutError = error instanceof Error ? error.message : this.localize.t.chatList.logoutError;
    } finally {
      this.isLoggingOut = false;
    }
  }

  private handleSelectDirectoryContact(contact: DirectoryContact): void {
    this.newChatContact = contact;
    this.selectedChat = null;
    this.isNewChatOpen = false;
    this.messageDraft = '';
    this.activeConversationId = null;
    this.startConversationError = null;

    const requestId = ++this.startConversationRequestId;
    void findDirectMessageConversation(contact.id)
      .then((conversation) => {
        if (requestId !== this.startConversationRequestId) return;
        this.activeConversationId = conversation?.id ?? null;
        if (conversation) {
          void this.loadMessages(conversation.id);
        }
      })
      .catch((error: unknown) => {
        if (requestId !== this.startConversationRequestId) return;
        this.startConversationError =
          error instanceof Error ? error.message : this.localize.t.chatList.newChatStartError;
      });
  }

  private get filteredChats(): ChatSummary[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.chats;
    return this.chats.filter(
      (chat) => chat.name.toLowerCase().includes(query) || chat.preview?.toLowerCase().includes(query),
    );
  }

  private get activeChat(): ActiveChat | null {
    if (this.newChatContact) {
      return {
        id: this.activeConversationId ?? this.newChatContact.id,
        otherUserId: this.newChatContact.id,
        name: this.newChatContact.name,
        initials: this.newChatContact.initials,
        gradient: this.newChatContact.gradient,
        subtitle: this.newChatContact.subtitle,
        online: this.newChatContact.online,
      };
    }
    if (!this.selectedChat) return null;
    return {
      id: this.selectedChat.id,
      otherUserId: this.selectedChat.otherUserId,
      name: this.selectedChat.name,
      initials: this.selectedChat.initials,
      gradient: this.selectedChat.gradient,
      subtitle: null,
      online: this.selectedChat.online,
    };
  }

  /** Live presence overrides the REST-fetched snapshot the moment a `/topic/presence` event arrives. */
  private isOnline(userId: string, fallback: boolean): boolean {
    return this.presenceByUserId[userId] ?? fallback;
  }

  /** Whether the other participant of the currently open chat is typing to us right now. */
  private get isOtherTyping(): boolean {
    const chat = this.activeChat;
    return chat != null && this.typingByUserId[chat.otherUserId] === true;
  }

  /**
   * Tells the other side we've started typing (once per burst of keystrokes), and arms a timer to
   * tell them we've stopped after a pause. Sends nothing while no chat is open.
   */
  private notifyTyping(isComposing: boolean): void {
    const otherUserId = this.activeChat?.otherUserId;
    if (!otherUserId) return;

    clearTimeout(this.typingStopTimer);

    if (!isComposing) {
      this.stopTyping();
      return;
    }

    if (!this.isTypingSent) {
      this.isTypingSent = true;
      sendTyping(otherUserId, true);
    }
    this.typingStopTimer = setTimeout(() => this.stopTyping(), TYPING_STOP_DELAY_MS);
  }

  private stopTyping(): void {
    clearTimeout(this.typingStopTimer);
    if (!this.isTypingSent) return;

    this.isTypingSent = false;
    const otherUserId = this.activeChat?.otherUserId;
    if (otherUserId) sendTyping(otherUserId, false);
  }

  private get mobileScreen(): MobileScreen {
    if (this.isNewChatOpen) return 'search';
    if (this.activeChat) return 'conversation';
    return 'list';
  }

  private get activeThread(): ThreadMessage[] {
    const chat = this.activeChat;
    if (!chat) return [];
    const fetched = this.messagesByConversation[chat.id] ?? [];
    return [...fetched, ...(this.sentMessages[chat.id] ?? [])];
  }

  private handleComposerInput(event: Event): void {
    const input = event.currentTarget as HTMLElementTagNameMap['wa-input'];
    this.messageDraft = input.value ?? '';
    this.notifyTyping(this.messageDraft.trim().length > 0);
  }

  private handleComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.sendMessage();
    }
  }

  private async sendMessage(): Promise<void> {
    const text = this.messageDraft.trim();
    const otherUserId = this.newChatContact?.id ?? this.selectedChat?.otherUserId;
    if (!text || !this.activeChat || !otherUserId) return;

    this.messageDraft = '';
    this.stopTyping();

    try {
      const conversation = await createDirectMessageConversation(otherUserId, text);
      this.activeConversationId = conversation.id;
      this.startConversationError = null;
    } catch (error) {
      this.startConversationError =
        error instanceof Error ? error.message : this.localize.t.chatList.newChatStartError;
      return;
    }

    const chat = this.activeChat;
    if (!chat) return;

    const now = new Date();
    const message: ThreadMessage = {
      id: `local-${Date.now()}`,
      text,
      outgoing: true,
      date: now,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    this.sentMessages = {
      ...this.sentMessages,
      [chat.id]: [...(this.sentMessages[chat.id] ?? []), message],
    };

    void this.loadConversations(true);
  }

  protected updated(): void {
    const thread = this.querySelector('[data-role="thread-scroll"]');
    if (thread) {
      thread.scrollTop = thread.scrollHeight;
    }
  }

  private renderAvatar(initials: string, gradient: string, sizeRem: number, online: boolean) {
    const dotSize = sizeRem >= 3 ? 'h-3 w-3' : 'h-2.5 w-2.5';

    return html`
      <span class="relative inline-flex flex-shrink-0">
        <wa-avatar
          initials=${initials}
          shape="circle"
          style=${`--size: ${sizeRem}rem; background: ${gradient}; color: #ffffff;`}
        ></wa-avatar>
        <span
          class=${`absolute right-0 bottom-0 ${dotSize} rounded-full border-2 border-white ${online ? 'bg-emerald-500' : 'bg-slate-300'}`}
          aria-hidden="true"
        ></span>
      </span>
    `;
  }

  /** Replaces the online/offline subtitle in the conversation header while the other participant is typing. */
  private renderTypingStatus() {
    return html`
      <span class="inline-flex items-center gap-1.5 text-indigo-600">
        ${this.localize.t.chatList.typing}
        <span class="inline-flex items-center gap-0.5" aria-hidden="true">
          <span class="h-1 w-1 animate-bounce rounded-full bg-indigo-600 [animation-delay:-0.3s]"></span>
          <span class="h-1 w-1 animate-bounce rounded-full bg-indigo-600 [animation-delay:-0.15s]"></span>
          <span class="h-1 w-1 animate-bounce rounded-full bg-indigo-600"></span>
        </span>
      </span>
    `;
  }

  private renderChatRow(chat: ChatSummary) {
    const isSelected = !this.newChatContact && chat.id === this.selectedChat?.id;

    return html`
      <button
        type="button"
        class=${`flex w-full items-center gap-3 rounded-2xl px-3 py-8 text-left transition-colors ${
          isSelected ? 'bg-indigo-50' : 'hover:bg-slate-100'
        }`}
        @click=${() => this.handleSelectChat(chat)}
      >
        ${this.renderAvatar(chat.initials, chat.gradient, 3, this.isOnline(chat.otherUserId, chat.online))}

        <span class="min-w-0 flex-1">
          <span class="flex items-baseline justify-between gap-2">
            <span class="truncate text-sm font-semibold text-slate-900">${chat.name}</span>
            <span class="flex-shrink-0 font-mono text-[11px] text-slate-400">${chat.time}</span>
          </span>
          <span class="mt-0.5 flex items-center gap-1.5">
            <span class="min-w-0 flex-1 truncate text-[13px] text-slate-500">${chat.preview}</span>
          </span>
        </span>
      </button>
    `;
  }

  private renderDirectoryRow(contact: DirectoryContact) {
    return html`
      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-2xl px-3 py-7 text-left transition-colors hover:bg-slate-100"
        @click=${() => this.handleSelectDirectoryContact(contact)}
      >
        ${this.renderAvatar(contact.initials, contact.gradient, 3, this.isOnline(contact.id, contact.online))}
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold text-slate-900">${contact.name}</span>
          <span class="block truncate text-[13px] text-slate-500">${contact.subtitle}</span>
        </span>
      </button>
    `;
  }

  private renderSearchIcon() {
    return html`
      <span
        slot="start"
        class="icon-mask h-4 w-4 text-slate-400 [--icon-url:url(/icons/search.svg)]"
        aria-hidden="true"
      ></span>
    `;
  }

  private renderBackButton(onClick: () => void, extraClasses = '') {
    return html`
      <button
        type="button"
        class=${`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-900 transition-colors hover:bg-slate-200 ${extraClasses}`}
        aria-label=${this.localize.t.common.back}
        @click=${onClick}
      >
        <span
          class="icon-mask h-4 w-4 text-slate-900 [--icon-url:url(/icons/chevron-left.svg)]"
          aria-hidden="true"
        ></span>
      </button>
    `;
  }

  private renderStatusDot(status: ThreadMessage['status']) {
    if (status === 'sent') {
      return html`<span class="h-1.5 w-1.5 flex-shrink-0 rounded-full border border-slate-400" aria-hidden="true"></span>`;
    }
    if (status === 'delivered') {
      return html`<span class="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" aria-hidden="true"></span>`;
    }
    return html`<span class="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" aria-hidden="true"></span>`;
  }

  private formatDateHeader(date: Date): string {
    const t = this.localize.t;
    const now = new Date();

    if (isSameDay(date, now)) return t.chatList.dateToday;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameDay(date, yesterday)) return t.chatList.dateYesterday;

    return date.toLocaleDateString(getLocale(), {
      month: 'long',
      day: 'numeric',
      year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    });
  }

  private renderDateHeader(date: Date) {
    return html`
      <div class="flex justify-center py-1">
        <span class="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
          ${this.formatDateHeader(date)}
        </span>
      </div>
    `;
  }

  private renderThread(thread: ThreadMessage[]) {
    let previousDate: Date | null = null;

    return thread.map((message) => {
      const showDateHeader = !previousDate || !isSameDay(previousDate, message.date);
      previousDate = message.date;

      return html`${showDateHeader ? this.renderDateHeader(message.date) : null}${this.renderMessageBubble(message)}`;
    });
  }

  private renderMessageBubble(message: ThreadMessage) {
    return html`
      <div class=${`flex ${message.outgoing ? 'justify-end' : 'justify-start'}`}>
        <div class="max-w-[78%]">
          <div
            class=${`rounded-2xl px-3.5 py-2.5 text-sm leading-snug break-words shadow-sm ${
              message.outgoing ? 'bg-indigo-600 text-white' : 'bg-white text-slate-900'
            }`}
          >
            ${message.text}
          </div>
          <div class=${`mt-1 flex items-center gap-1 ${message.outgoing ? 'justify-end' : 'justify-start'}`}>
            ${message.outgoing ? this.renderStatusDot(message.status) : null}
            <span class="font-mono text-[10px] text-slate-400">${message.time}</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderComposer() {
    const t = this.localize.t;

    return html`
      <div class="flex flex-shrink-0 items-center gap-2 border-t border-slate-200 px-3 py-3 sm:px-4">
        <button
          type="button"
          class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
          aria-label=${t.chatList.attach}
        >
          <span
            class="icon-mask h-4 w-4 text-slate-500 [--icon-url:url(/icons/plus.svg)]"
            aria-hidden="true"
          ></span>
        </button>
        <wa-input
          class="min-w-0 flex-1"
          size="medium"
          pill
          placeholder=${t.chatList.messagePlaceholder}
          .value=${this.messageDraft}
          @input=${this.handleComposerInput}
          @keydown=${this.handleComposerKeydown}
        ></wa-input>
        <button
          type="button"
          class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          aria-label=${t.chatList.send}
          ?disabled=${!this.messageDraft.trim()}
          @click=${() => void this.sendMessage()}
        >
          <span class="icon-mask h-4 w-4 text-white [--icon-url:url(/icons/send.svg)]" aria-hidden="true"></span>
        </button>
      </div>
    `;
  }

  private renderDirectoryList() {
    const t = this.localize.t;
    const contacts = this.contacts;

    if (this.isContactsLoading) {
      return html`
        <div class="flex flex-col items-center justify-center px-6 py-16 text-center">
          <wa-spinner style="font-size: 1.5rem;"></wa-spinner>
        </div>
      `;
    }

    if (!contacts.length) {
      return html`
        <div class="flex flex-col items-center justify-center px-6 py-16 text-center">
          <p class="text-sm font-semibold text-slate-700">${t.chatList.newChatEmptyTitle}</p>
          <p class="mt-1 text-sm text-slate-500">${this.contactsError ?? t.chatList.newChatEmptySubtitle}</p>
        </div>
      `;
    }

    return html`
      <p class="px-3 pt-2 pb-1 font-mono text-[10.5px] font-semibold tracking-wide text-slate-400 uppercase">
        ${t.chatList.suggested}
      </p>
      <div class="flex flex-col gap-1">${contacts.map((contact) => this.renderDirectoryRow(contact))}</div>
      ${this.isContactsLoadingMore
        ? html`
            <div class="flex items-center justify-center py-3">
              <wa-spinner style="font-size: 1.25rem;"></wa-spinner>
            </div>
          `
        : null}
    `;
  }

  private renderAccountMenu() {
    const t = this.localize.t;

    return html`
      <div class="group/account relative flex-shrink-0">
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 group-focus-within/account:bg-slate-100"
          aria-label=${t.chatList.accountMenu}
        >
          <span
            class="icon-mask h-4 w-4 text-slate-600 [--icon-url:url(/icons/dots-vertical.svg)]"
            aria-hidden="true"
          ></span>
        </button>
        <div
          class="invisible absolute top-full right-0 z-10 mt-1 w-40 origin-top-right scale-95 rounded-xl border border-slate-200 bg-white p-1 opacity-0 shadow-lg transition-[opacity,transform,visibility] duration-150 group-hover/account:visible group-hover/account:scale-100 group-hover/account:opacity-100 group-focus-within/account:visible group-focus-within/account:scale-100 group-focus-within/account:opacity-100"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            ?disabled=${this.isLoggingOut}
            @click=${() => void this.handleLogout()}
          >
            <span
              class="icon-mask h-4 w-4 text-red-600 [--icon-url:url(/icons/logout.svg)]"
              aria-hidden="true"
            ></span>
            ${t.chatList.logout}
          </button>
        </div>
      </div>
    `;
  }

  private renderListPane() {
    const t = this.localize.t;
    const chats = this.filteredChats;

    return html`
      <div
        class=${`${this.mobileScreen === 'list' ? 'flex' : 'hidden'} h-full w-full flex-col bg-white md:flex md:w-[380px] md:flex-none md:border-r md:border-slate-200 lg:w-[420px]`}
      >
        <div class="flex-shrink-0 border-b border-slate-200 px-4 pt-5 pb-3 sm:px-5">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600">
                <span class="h-3 w-3 rounded-sm bg-white"></span>
              </span>
              <span class="text-lg font-semibold text-slate-900">Simply<span class="text-indigo-600">C</span></span>
            </div>
            ${this.renderAccountMenu()}
          </div>
          ${this.logoutError
            ? html`<p class="mt-2 text-xs text-red-600">${this.logoutError}</p>`
            : null}

          <div class="mt-4 flex items-center justify-between gap-2">
            <h1 class="text-2xl font-bold text-slate-900">${t.chatList.title}</h1>
            <button
              type="button"
              class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors hover:bg-indigo-100"
              aria-label=${t.chatList.newChat}
              @click=${() => this.openNewChat()}
            >
              <span
                class="icon-mask h-4 w-4 text-indigo-600 [--icon-url:url(/icons/plus.svg)]"
                aria-hidden="true"
              ></span>
            </button>
          </div>

          <wa-input
            class="mt-3 block"
            type="search"
            size="medium"
            pill
            with-clear
            placeholder=${t.chatList.searchPlaceholder}
            .value=${this.searchQuery}
            @input=${this.handleSearchInput}
          >
            ${this.renderSearchIcon()}
          </wa-input>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3" @scroll=${this.handleChatsScroll}>
          ${this.isChatsLoading
            ? html`
                <div class="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <wa-spinner style="font-size: 1.5rem;"></wa-spinner>
                </div>
              `
            : chats.length
              ? html`
                  <div class="flex flex-col gap-1">${chats.map((chat) => this.renderChatRow(chat))}</div>
                  ${this.isChatsLoadingMore
                    ? html`
                        <div class="flex items-center justify-center py-3">
                          <wa-spinner style="font-size: 1.25rem;"></wa-spinner>
                        </div>
                      `
                    : null}
                `
              : html`
                  <div class="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
                    <p class="text-sm font-semibold text-slate-700">${t.chatList.searchEmptyTitle}</p>
                    <p class="mt-1 text-sm text-slate-500">${this.chatsError ?? t.chatList.searchEmptySubtitle}</p>
                  </div>
                `}
        </div>

        <button
          type="button"
          class="absolute right-5 bottom-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/30 transition-colors hover:bg-indigo-600 md:hidden"
          aria-label=${t.chatList.newChat}
          @click=${() => this.openNewChat()}
        >
          <span
            class="icon-mask h-5 w-5 text-white [--icon-url:url(/icons/plus.svg)]"
            aria-hidden="true"
          ></span>
        </button>
      </div>
    `;
  }

  /** Full-screen "New chat" contact picker, shown on mobile in place of the list pane. */
  private renderSearchPane() {
    const t = this.localize.t;

    return html`
      <div class=${`${this.mobileScreen === 'search' ? 'flex' : 'hidden'} h-full w-full flex-col bg-white md:hidden`}>
        <div class="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          ${this.renderBackButton(() => this.closeNewChat())}
          <h1 class="text-base font-semibold text-slate-900">${t.chatList.newChat}</h1>
        </div>
        <div class="flex-shrink-0 px-4 pt-3 pb-1 sm:px-5">
          <wa-input
            type="search"
            size="medium"
            pill
            with-clear
            placeholder=${t.chatList.newChatSearchPlaceholder}
            .value=${this.newChatQuery}
            @input=${this.handleNewChatSearchInput}
          >
            ${this.renderSearchIcon()}
          </wa-input>
        </div>
        <div
          class="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3"
          @scroll=${this.handleContactsScroll}
        >
          ${this.renderDirectoryList()}
        </div>
      </div>
    `;
  }

  /** Same contact picker, presented as an overlay dialog on tablet/desktop split view. */
  private renderNewChatDialog() {
    const t = this.localize.t;

    return html`
      <div class="hidden md:contents">
        <wa-dialog
          ?open=${this.isNewChatOpen}
          label=${t.chatList.newChat}
          light-dismiss
          @wa-after-hide=${() => this.closeNewChat()}
        >
          <div class="contents [--spacing:0.25rem]">
            <wa-input
              type="search"
              size="medium"
              pill
              with-clear
              autofocus
              placeholder=${t.chatList.newChatSearchPlaceholder}
              .value=${this.newChatQuery}
              @input=${this.handleNewChatSearchInput}
            >
              ${this.renderSearchIcon()}
            </wa-input>
            <div class="mt-3 max-h-80 overflow-y-auto" @scroll=${this.handleContactsScroll}>
              ${this.renderDirectoryList()}
            </div>
          </div>
        </wa-dialog>
      </div>
    `;
  }

  private renderDetailPane() {
    const t = this.localize.t;
    const chat = this.activeChat;
    const thread = this.activeThread;

    return html`
      <div class=${`${this.mobileScreen === 'conversation' ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col bg-white md:flex`}>
        ${chat
          ? html`
              <div class="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
                ${this.renderBackButton(() => this.handleBackToList(), 'md:hidden')}
                ${this.renderAvatar(chat.initials, chat.gradient, 2.5, this.isOnline(chat.otherUserId, chat.online))}
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-slate-900">${chat.name}</p>
                  <p class="truncate text-xs text-slate-500">
                    ${this.isOtherTyping
                      ? this.renderTypingStatus()
                      : (chat.subtitle ?? (this.isOnline(chat.otherUserId, chat.online) ? t.chatList.online : t.chatList.offline))}
                  </p>
                </div>
              </div>
              ${this.startConversationError
                ? html`
                    <p class="flex-shrink-0 border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600 sm:px-5">
                      ${this.startConversationError}
                    </p>
                  `
                : null}
              <div data-role="thread-scroll" class="min-h-0 flex-1 overflow-y-auto bg-gradient-to-br from-indigo-100 to-rose-50 px-4 py-4 sm:px-5">
                ${this.isMessagesLoading
                  ? html`
                      <div class="flex h-full items-center justify-center">
                        <wa-spinner style="font-size: 1.5rem;"></wa-spinner>
                      </div>
                    `
                  : thread.length
                    ? html`<div class="flex flex-col gap-3">${this.renderThread(thread)}</div>`
                    : html`
                        <div class="flex h-full flex-col items-center justify-center gap-3 px-2 text-center">
                          <span
                            class="icon-mask h-12 w-12 text-slate-300 [--icon-url:url(/icons/chat-thread.svg)]"
                            aria-hidden="true"
                          ></span>
                          <p class="max-w-xs text-sm text-slate-500">
                            ${this.messagesError ?? interpolate(t.chatList.emptyThreadHint, { name: chat.name.split(' ')[0] })}
                          </p>
                        </div>
                      `}
              </div>
              ${this.renderComposer()}
            `
          : html`
              <div class="hidden flex-1 flex-col items-center justify-center bg-slate-50 md:flex">
                <span
                  class="icon-mask h-12 w-12 text-slate-300 [--icon-url:url(/icons/chat-bubble.svg)]"
                  aria-hidden="true"
                ></span>
                <p class="mt-3 text-sm font-semibold text-slate-700">${t.chatList.detailEmptyTitle}</p>
                <p class="mt-1 max-w-xs text-center text-sm text-slate-500">${t.chatList.detailEmptySubtitle}</p>
              </div>
            `}
      </div>
    `;
  }

  protected render() {
    return html`
      <main class="relative flex h-dvh w-full overflow-hidden bg-white">
        ${this.renderListPane()} ${this.renderSearchPane()} ${this.renderDetailPane()} ${this.renderNewChatDialog()}
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'home-page': HomePage;
  }
}

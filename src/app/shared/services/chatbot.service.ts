import { Injectable, inject, signal } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ChatContext {
  userRole?: string;
  currentPage?: string;
  userName?: string;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private functions = inject(Functions);
  private auth = inject(Auth);
  private router = inject(Router);
  private isSending = false;
  private lastSendAt = 0;
  private readonly minSendIntervalMs = 800;

  readonly messages = signal<ChatMessage[]>([]);
  readonly loading = signal(false);
  readonly open = signal(false);

  toggle() {
    this.open.update((v) => !v);
  }

  close() {
    this.open.set(false);
  }

  clearHistory() {
    this.messages.set([]);
  }

  async sendMessage(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || this.loading() || this.isSending) return;

    const now = Date.now();
    if (now - this.lastSendAt < this.minSendIntervalMs) {
      const waitMsg: ChatMessage = {
        role: 'assistant',
        content: 'Please wait a moment before sending another message.',
        timestamp: new Date(),
      };
      this.messages.update((msgs) => [...msgs, waitMsg]);
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: trimmed, timestamp: new Date() };
    this.messages.update((msgs) => [...msgs, userMsg]);
    this.loading.set(true);
    this.isSending = true;
    this.lastSendAt = now;

    try {
      const context = this.buildContext();
      const history = this.messages().map(({ role, content }) => ({ role, content }));

      const fn = httpsCallable<
        { messages: { role: string; content: string }[]; context: ChatContext },
        { reply: string }
      >(this.functions, 'chatWithAI');

      const result = await fn({ messages: history, context });

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: result.data.reply,
        timestamp: new Date(),
      };
      this.messages.update((msgs) => [...msgs, assistantMsg]);
    } catch (err: unknown) {
      const code = String((err as { code?: string })?.code || '');
      const message =
        code === 'functions/resource-exhausted'
          ? 'Too many requests right now. Please wait a few seconds and try again.'
          : '⚠️ An error occurred. Please try again.';

      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: message,
        timestamp: new Date(),
      };
      this.messages.update((msgs) => [...msgs, errorMsg]);
      console.error('[ChatbotService] Error:', err);
    } finally {
      this.loading.set(false);
      this.isSending = false;
    }
  }

  private buildContext(): ChatContext {
    const user = this.auth.currentUser;
    const currentPage = this.router.url;

    return {
      userName: user?.displayName ?? undefined,
      currentPage,
    };
  }
}

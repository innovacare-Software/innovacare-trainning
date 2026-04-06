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
    if (!trimmed || this.loading()) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed, timestamp: new Date() };
    this.messages.update((msgs) => [...msgs, userMsg]);
    this.loading.set(true);

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
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: '⚠️ An error occurred. Please try again.',
        timestamp: new Date(),
      };
      this.messages.update((msgs) => [...msgs, errorMsg]);
      console.error('[ChatbotService] Error:', err);
    } finally {
      this.loading.set(false);
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

import {
  Component,
  inject,
  signal,
  viewChild,
  ElementRef,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../../services/chatbot.service';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
})
export class ChatbotComponent {
  protected chatbot = inject(ChatbotService);
  protected input = signal('');

  private messagesEnd = viewChild<ElementRef>('messagesEnd');

  constructor() {
    // Scroll to bottom whenever messages change
    effect(() => {
      const _ = this.chatbot.messages();
      setTimeout(() => this.scrollToBottom(), 50);
    });
  }

  protected send() {
    const text = this.input().trim();
    if (!text || this.chatbot.loading()) return;
    this.input.set('');
    this.chatbot.sendMessage(text);
  }

  protected onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  protected clearChat() {
    this.chatbot.clearHistory();
  }

  private scrollToBottom() {
    try {
      this.messagesEnd()?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    } catch {}
  }

  protected trackByIndex(index: number) {
    return index;
  }
}

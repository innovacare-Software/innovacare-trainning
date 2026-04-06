import { Component } from '@angular/core';
import { RouterOutlet} from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ChatbotComponent } from './shared/components/chatbot/chatbot.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HttpClientModule, ChatbotComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {}

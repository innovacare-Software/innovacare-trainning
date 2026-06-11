import {EmailProvider} from "./email-provider.interface";
import {SendEmailInput, SendEmailResult} from "./models";

export class SendgridEmailProvider implements EmailProvider {
  constructor(private readonly apiKey: string) {}

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{email: input.to, name: input.toName}],
            ...((input.cc || []).filter(e => !!e).length > 0 && { cc: (input.cc || []).filter(e => !!e).map((email) => ({email})) }),
            ...((input.bcc || []).filter(e => !!e).length > 0 && { bcc: (input.bcc || []).filter(e => !!e).map((email) => ({email})) }),
            subject: input.subject,
          }],
          from: {
            email: input.fromEmail,
            name: input.fromName,
          },
          reply_to: input.replyTo ? {email: input.replyTo} : undefined,
          content: [
            {type: "text/plain", value: input.text || ""},
            {type: "text/html", value: input.html},
          ],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        return {
          success: false,
          provider: "sendgrid",
          errorMessage: body || `Sendgrid HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        provider: "sendgrid",
        providerMessageId: response.headers.get("x-message-id") || undefined,
      };
    } catch (error) {
      return {
        success: false,
        provider: "sendgrid",
        errorMessage: error instanceof Error ? error.message : "Unknown SendGrid error",
      };
    }
  }
}

import {EmailProvider} from "./email-provider.interface";
import {SendEmailInput, SendEmailResult} from "./models";

export class ResendEmailProvider implements EmailProvider {
  constructor(private readonly apiKey: string) {}

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: input.fromName ? `${input.fromName} <${input.fromEmail}>` : input.fromEmail,
          to: [input.to],
          cc: input.cc || [],
          bcc: input.bcc || [],
          reply_to: input.replyTo,
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });

      const payload = await response.json() as {id?: string; message?: string; error?: {message?: string}};

      if (!response.ok) {
        return {
          success: false,
          provider: "resend",
          errorMessage: payload?.error?.message || payload?.message || `Resend HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        provider: "resend",
        providerMessageId: payload.id,
      };
    } catch (error) {
      return {
        success: false,
        provider: "resend",
        errorMessage: error instanceof Error ? error.message : "Unknown Resend error",
      };
    }
  }
}

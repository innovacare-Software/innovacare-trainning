import {EmailProvider} from "./email-provider.interface";
import {SendEmailInput, SendEmailResult} from "./models";
import {ResendEmailProvider} from "./resend-email-provider";
import {SendgridEmailProvider} from "./sendgrid-email-provider";

class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    console.info("[notification.email.console]", {
      to: input.to,
      subject: input.subject,
      htmlPreview: input.html.slice(0, 180),
    });
    return {
      success: true,
      provider: "console",
      providerMessageId: `console-${Date.now()}`,
    };
  }
}

export function createEmailProviderFromEnv(): {
  provider: EmailProvider | null;
  providerName: string;
  configured: boolean;
} {
  const selected = String(process.env.EMAIL_PROVIDER || "console").trim().toLowerCase();

  if (selected === "console") {
    return {provider: new ConsoleEmailProvider(), providerName: "console", configured: true};
  }

  if (selected === "sendgrid") {
    const apiKey = String(process.env.SENDGRID_API_KEY || "").trim();
    if (!apiKey) {
      return {provider: null, providerName: "sendgrid", configured: false};
    }
    return {provider: new SendgridEmailProvider(apiKey), providerName: "sendgrid", configured: true};
  }

  if (selected === "resend") {
    const apiKey = String(process.env.RESEND_API_KEY || "").trim();
    if (!apiKey) {
      return {provider: null, providerName: "resend", configured: false};
    }
    return {provider: new ResendEmailProvider(apiKey), providerName: "resend", configured: true};
  }

  return {provider: null, providerName: selected || "unknown", configured: false};
}

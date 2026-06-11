import {SendSmsInput, SendSmsResult} from "./models";

export class TwilioSmsProvider {
  constructor(
    private readonly accountSid: string,
    private readonly authToken: string
  ) {}

  async sendSms(input: SendSmsInput): Promise<SendSmsResult> {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");

      const params = new URLSearchParams();
      params.append("To", input.to);
      params.append("From", input.from);
      params.append("Body", input.body);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const data = await response.json() as {
        sid?: string;
        message?: string;
        code?: number;
        status?: string;
      };

      if (!response.ok) {
        return {
          success: false,
          provider: "twilio",
          errorMessage: data.message || `Twilio HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        provider: "twilio",
        providerMessageId: data.sid,
      };
    } catch (error) {
      return {
        success: false,
        provider: "twilio",
        errorMessage: error instanceof Error ? error.message : "Unknown Twilio error",
      };
    }
  }
}

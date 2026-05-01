import {SendEmailInput, SendEmailResult} from "./models";

export interface EmailProvider {
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
}

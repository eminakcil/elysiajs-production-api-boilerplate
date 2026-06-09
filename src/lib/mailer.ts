import { env } from "../config/env";

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** A transport actually delivers a mail. Swap this to wire a real provider. */
type Transport = (
  mail: Required<Pick<Mail, "to" | "subject" | "text">> & Mail,
) => Promise<void>;

/**
 * Dev transport: logs the email to the console. Replace with a real transport
 * (SMTP via nodemailer, Resend API, etc.) — keep the same `Transport` shape so
 * nothing else changes.
 */
const logTransport: Transport = async (mail) => {
  console.log(
    `📧 [mail] from=${env.EMAIL_FROM} to=${mail.to} subject="${mail.subject}"\n${mail.text}`,
  );
};

const transport: Transport = logTransport;

/**
 * In-memory record of recently sent mail. Useful in dev/tests to inspect what
 * would have been sent (e.g. to read an OTP code). Capped; not for production
 * delivery guarantees.
 */
export const outbox: Mail[] = [];
const OUTBOX_LIMIT = 50;

export const mailer = {
  async send(mail: Mail): Promise<void> {
    await transport(mail);
    outbox.push(mail);
    if (outbox.length > OUTBOX_LIMIT) outbox.shift();
  },

  /** Most recent mail sent to `to` (test/dev helper). */
  lastTo(to: string): Mail | undefined {
    for (let i = outbox.length - 1; i >= 0; i--) {
      if (outbox[i].to === to) return outbox[i];
    }
    return undefined;
  },
};

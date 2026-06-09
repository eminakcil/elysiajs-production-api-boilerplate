import { type Mail, mailer } from "@/lib/mailer";
import { defineQueue } from "./define";

/**
 * Email queue. Producers call `emailQueue.add(mail)`; the worker (or the inline
 * sync driver) delivers via `mailer.send`. Don't call `mailer.send` directly
 * from request handlers — enqueue instead.
 */
export const emailQueue = defineQueue<Mail>("email", (mail) =>
  mailer.send(mail),
);

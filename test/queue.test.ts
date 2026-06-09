import { describe, expect, it } from "bun:test";
import { outbox as mailOutbox } from "../src/lib/mailer";
import { emailQueue } from "../src/queue/email.queue";

// Tests run with the "sync" driver (see queue/connection.ts), so `.add()`
// processes the job inline — no Redis or worker required.
describe("queues (sync driver)", () => {
  it("processes an email job inline", async () => {
    const to = `q_${crypto.randomUUID()}@example.com`;
    await emailQueue.add({ to, subject: "Hi", text: "hello from the queue" });

    const sent = mailOutbox.find((m) => m.to === to);
    expect(sent?.subject).toBe("Hi");
  });
});

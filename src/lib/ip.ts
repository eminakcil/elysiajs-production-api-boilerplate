import { env } from "@/config/env";

/** Minimal shape of the Bun server needed to resolve a client IP. */
type IpServer = {
  requestIP?: (request: Request) => { address: string } | null;
} | null;

/**
 * Resolve the client IP. Behind a proxy/load balancer set `TRUST_PROXY=true` to
 * use the first `X-Forwarded-For` hop; otherwise the direct socket address.
 */
export function clientIp(request: Request, server: IpServer): string {
  if (env.TRUST_PROXY) {
    const xff = request.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]?.trim() || "unknown";
  }
  return server?.requestIP?.(request)?.address ?? "unknown";
}

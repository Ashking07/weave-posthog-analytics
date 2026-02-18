/**
 * Client-side PostHog analytics.
 * Tracks page views and unique visitors. View stats at https://app.posthog.com
 * Set NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST in .env.local
 */
import posthog from "posthog-js";

if (typeof window !== "undefined") {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  if (key) {
    posthog.init(key, {
      api_host: host,
      capture_pageview: true,
      person_profiles: "identified_only",
    });
  }
}

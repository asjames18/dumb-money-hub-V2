// Fire-and-forget anonymous event beacon for first-party analytics.
// Payload is { path, ts, event } ONLY — no cookies, no fingerprinting,
// no wallet data, no PII. Must never throw and never break the app.

export type AnalyticsEvent =
  | "quick_scan"
  | "deep_scan"
  | "pass_burn_dumb"
  | "pass_burn_pls"
  | "burn_voluntary"
  | "burn_voluntary_pls"
  | "pro_pass_burn"
  | "wallet_connect"
  | "share_tap"
  | "watchlist_toggle"
  | "bag_scan"
  | "scan_started"
  | "burn_started"
  | "swap_quote"
  | "swap_attempt"
  | "swap_confirmed"
  | "swap_failed"
  | "copy_contract"
  | "add_to_wallet"
  | "raid_play"
  | "rating_submitted"
  | "brag_share"
  | "err_quote"
  | "err_tx"
  | "err_scan";

export function trackEvent(event: AnalyticsEvent): void {
  try {
    // Never track the private stats page itself.
    if (window.location.pathname.startsWith("/stats")) return;
    const body = JSON.stringify({
      path: window.location.pathname,
      referrer: document.referrer || "",
      ts: Date.now(),
      event,
    });
    if (body.length <= 2048 && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/ping", body);
    }
  } catch {
    /* analytics must never break the app */
  }
}

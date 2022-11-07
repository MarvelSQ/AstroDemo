import { onCLS, onFCP, onFID, onLCP, onTTFB, onINP, Metric } from "web-vitals";

const vitalsUrl = "https://vitals.vercel-analytics.com/v1/vitals";

function getConnectionSpeed() {
  return "connection" in navigator &&
    navigator["connection"] &&
    "effectiveType" in navigator["connection"]
    ? navigator["connection"]["effectiveType"]
    : "";
}

function sendToAnalytics(
  metric: Metric,
  options: {
    path: string;
    analyticsId: string;
    debug?: boolean;
  }
) {
  const page = options.path;

  const body = {
    dsn: options.analyticsId,
    id: metric.id,
    page,
    href: location.href,
    event_name: metric.name,
    value: metric.value.toString(),
    speed: getConnectionSpeed(),
  };

  if (options.debug) {
    console.log("[Analytics]", metric.name, JSON.stringify(body, null, 2));
  }

  const blob = new Blob([new URLSearchParams(body).toString()], {
    // This content type is necessary for `sendBeacon`
    type: "application/x-www-form-urlencoded",
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon(vitalsUrl, blob);
  } else
    fetch(vitalsUrl, {
      body: blob,
      method: "POST",
      credentials: "omit",
      keepalive: true,
    });
}

export function webVitals() {
  const analyticsId = import.meta.env.VERCEL_ANALYTICS_ID;

  if (!analyticsId) {
    return;
  }

  const options = {
    path: location.pathname,
    analyticsId,
  };

  try {
    onFID((metric) => sendToAnalytics(metric, options));
    onTTFB((metric) => sendToAnalytics(metric, options));
    onLCP((metric) => sendToAnalytics(metric, options));
    onCLS((metric) => sendToAnalytics(metric, options));
    onFCP((metric) => sendToAnalytics(metric, options));
    onINP((metric) => sendToAnalytics(metric, options));
  } catch (err) {
    console.error("[Analytics]", err);
  }
}

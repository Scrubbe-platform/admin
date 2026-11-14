/** @type {import('next').NextConfig} */

const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.scrubbe.com").origin;
  } catch {
    return "https://api.scrubbe.com";
  }
})();

const isProd = process.env.NODE_ENV === "production";

// An internal staff console: no framing, no third-party scripts, API calls to
// the Scrubbe API only, and never indexed by search engines.
const csp = [
  "default-src 'self'",
  // Next.js inlines its bootstrap scripts; dev mode also needs eval for HMR.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  // Cover images and email previews can reference any HTTPS image.
  `img-src 'self' data: blob: https:${isProd ? "" : " http:"}`,
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}${isProd ? "" : " ws: http://localhost:*"}`,
  "frame-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Cover images are absolute URLs (the API serves uploads itself), rendered with <img>.
    unoptimized: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

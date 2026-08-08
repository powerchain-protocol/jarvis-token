import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./lib/server/headers";
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() { return [{ source: "/:path*", headers: Object.entries(SECURITY_HEADERS).map(([key, value]) => ({ key, value })) }]; }
};
export default nextConfig;

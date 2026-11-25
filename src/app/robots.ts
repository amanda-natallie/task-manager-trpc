import type { MetadataRoute } from "next";

// Served at /robots.txt. The demo has nothing private, so crawlers may index it.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" } };
}

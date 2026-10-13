import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

const V1_PATH = "/v1";

function networkAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);
}

function v1Rewrites() {
  const value = process.env.V1_ORIGIN?.trim();
  if (!value) {
    return [];
  }
  const { origin } = new URL(value);
  return [
    { source: V1_PATH, destination: `${origin}${V1_PATH}` },
    {
      source: `${V1_PATH}/:path*`,
      destination: `${origin}${V1_PATH}/:path*`,
    },
  ];
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: networkAddresses(),
  rewrites() {
    return Promise.resolve(v1Rewrites());
  },
};

export default nextConfig;

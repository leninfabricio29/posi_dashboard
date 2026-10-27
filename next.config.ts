import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que Turbopack tome como raíz una carpeta superior con otro lockfile.
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;

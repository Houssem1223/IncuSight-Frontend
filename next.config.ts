import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        // Le navigateur doit toujours revalider le service worker, sinon une
        // nouvelle version d'IncuSight pourrait n'etre detectee qu'apres 24 h.
        source: "/serwist/:path*",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

// withSerwist ne fait que declarer esbuild comme paquet serveur externe : le
// service worker est compile par le route handler src/app/serwist/[path].
export default withSerwist(nextConfig);

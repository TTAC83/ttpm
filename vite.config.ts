import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    mode === "development" && componentTagger(),
    mode === "production" && VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["/offline.html", "/icons/icon-192.png", "/icons/icon-256.png", "/icons/icon-384.png", "/icons/icon-512.png", "/icons/maskable-192.png", "/icons/maskable-512.png"],
      manifest: false,
      workbox: {
        navigateFallback: "/",
        navigateFallbackDenylist: [/^\/api\//, /^\/rest\//, /^\/storage\//],
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request, sameOrigin }) =>
              sameOrigin && ["style","script","image","font"].includes(request.destination),
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets-v1",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/rest/v1/"),
            handler: "StaleWhileRevalidate",
            method: "GET",
            options: {
              cacheName: "supabase-rest-get-v1",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 10 }
            }
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/storage/v1/object/"),
            handler: "StaleWhileRevalidate",
            method: "GET",
            options: {
              cacheName: "supabase-storage-v1",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

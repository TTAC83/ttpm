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
    react(),
    mode === "development" ? componentTagger() : null,
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["/offline.html", "/icons/icon-192.png", "/icons/icon-256.png", "/icons/icon-384.png", "/icons/icon-512.png", "/icons/maskable-192.png", "/icons/maskable-512.png"],
      manifest: false,
      devOptions: {
        enabled: false
      },
      workbox: {
        navigateFallback: "/",
        navigateFallbackDenylist: [/^\/api\//, /^\/rest\//, /^\/storage\//, /^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        runtimeCaching: [
          // Static assets — cache first, 30 day expiry
          {
            urlPattern: ({ request, sameOrigin }: { request: Request; sameOrigin: boolean }) =>
              sameOrigin && ["style","script","image","font"].includes(request.destination),
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets-v1",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          // Supabase REST GET — NetworkFirst with 24h fallback cache
          // NetworkFirst ensures fresh data when online, falls back to cache when offline
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith("/rest/v1/"),
            handler: "NetworkFirst",
            method: "GET",
            options: {
              cacheName: "supabase-rest-get-v2",
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
            }
          },
          // Supabase Storage objects — StaleWhileRevalidate, 7 day cache
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith("/storage/v1/object/"),
            handler: "StaleWhileRevalidate",
            method: "GET",
            options: {
              cacheName: "supabase-storage-v1",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          },
          // Auth endpoints — never cache
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith("/auth/v1/"),
            handler: "NetworkOnly" as const,
            method: "GET" as const,
            options: { cacheName: "supabase-auth-v1" }
          },
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith("/auth/v1/"),
            handler: "NetworkOnly" as const,
            method: "POST" as const,
            options: { cacheName: "supabase-auth-post-v1" }
          },
          // Line media uploads — BackgroundSync for offline queuing
          {
            urlPattern: ({ url }: { url: URL }) =>
              url.pathname.startsWith("/storage/v1/object/") && url.pathname.includes("line-media"),
            handler: "NetworkOnly" as const,
            method: "POST" as const,
            options: {
              backgroundSync: {
                name: "line-media-upload-queue",
                options: { maxRetentionTime: 24 * 60 }
              }
            }
          },
          // REST mutations — BackgroundSync as fallback (app-level queue is primary)
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith("/rest/v1/"),
            handler: "NetworkOnly" as const,
            method: "POST" as const,
            options: {
              backgroundSync: {
                name: "rest-mutation-post-queue",
                options: { maxRetentionTime: 24 * 60 }
              }
            }
          },
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith("/rest/v1/"),
            handler: "NetworkOnly" as const,
            method: "PATCH" as const,
            options: {
              backgroundSync: {
                name: "rest-mutation-patch-queue",
                options: { maxRetentionTime: 24 * 60 }
              }
            }
          },
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith("/rest/v1/"),
            handler: "NetworkOnly" as const,
            method: "DELETE" as const,
            options: {
              backgroundSync: {
                name: "rest-mutation-delete-queue",
                options: { maxRetentionTime: 24 * 60 }
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(__dirname, "node_modules/react/jsx-runtime.js"),
      "react/jsx-dev-runtime": path.resolve(__dirname, "node_modules/react/jsx-dev-runtime.js"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    force: true,
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    }
  },
}));

import type { CapacitorConfig } from "@capacitor/cli";

/**
 * TourGo ships with a LOCAL web bundle (Apple Guideline 4.2: приложение не
 * должно быть обёрткой над сайтом). SPA-бандл собирает
 * `npm run cap:build` → dist/client (см. vite.capacitor.config.ts);
 * server functions из бандла ходят на прод через server-fn-proxy.
 *
 * CAPACITOR_SERVER_URL оставлен ТОЛЬКО для live-reload разработки
 * (`npm run mobile:preview`) — в стор с ним собирать нельзя.
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.tourgo.app",
  appName: "TourGo",
  webDir: "dist/client",
  server: serverUrl
    ? { url: serverUrl, cleartext: false, androidScheme: "https" }
    : { androidScheme: "https" },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: "#0f172a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#0f172a",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;

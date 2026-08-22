import type { CapacitorConfig } from "@capacitor/cli";

/**
 * TourGo ships as a Capacitor shell around the production web app.
 * TanStack Start builds SSR assets without a local index.html, so the shell
 * loads the deployed site until we add a dedicated SPA export.
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL ?? "https://tripfinder-ai.vercel.app";

const config: CapacitorConfig = {
  appId: "com.tourgo.app",
  appName: "TourGo",
  webDir: ".output/public",
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: "https",
  },
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

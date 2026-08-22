import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

import { bindNativeDeepLinks } from "@/lib/native/deep-links";
import { isNativeApp } from "@/lib/native/app";
import { registerNativePushNotifications } from "@/lib/native/push";

export function NativeBootstrap() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;

    document.documentElement.classList.add("native-app");
    document.documentElement.style.setProperty("color-scheme", "light");

    let cleanupDeepLinks = () => {};

    void (async () => {
      try {
        const [{ SplashScreen }, { StatusBar, Style }, { Keyboard }] = await Promise.all([
          import("@capacitor/splash-screen"),
          import("@capacitor/status-bar"),
          import("@capacitor/keyboard"),
        ]);
        await StatusBar.setStyle({ style: Style.Light });
        await Keyboard.setAccessoryBarVisible({ isVisible: true });
        await SplashScreen.hide();
      } catch {
        // Plugins unavailable in browser preview.
      }

      cleanupDeepLinks = await bindNativeDeepLinks(router);
      await registerNativePushNotifications();
    })();

    return () => {
      cleanupDeepLinks();
    };
  }, [router]);

  return null;
}

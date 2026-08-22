import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import { isNativeApp } from "@/lib/native/app";

export function NativeNetworkBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncBrowser = () => setOffline(!navigator.onLine);
    syncBrowser();
    window.addEventListener("online", syncBrowser);
    window.addEventListener("offline", syncBrowser);

    let removeNative: (() => void) | undefined;

    if (isNativeApp()) {
      void (async () => {
        try {
          const { Network } = await import("@capacitor/network");
          const status = await Network.getStatus();
          setOffline(!status.connected);
          const handle = await Network.addListener("networkStatusChange", (s) => {
            setOffline(!s.connected);
          });
          removeNative = () => {
            void handle.remove();
          };
        } catch {
          // fall back to browser events only
        }
      })();
    }

    return () => {
      window.removeEventListener("online", syncBrowser);
      window.removeEventListener("offline", syncBrowser);
      removeNative?.();
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-destructive px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-center text-xs font-medium text-destructive-foreground"
    >
      <WifiOff className="size-3.5 shrink-0" />
      Нет интернета. Проверьте подключение.
    </div>
  );
}

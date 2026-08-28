/**
 * Ошибки рантайма — в телеметрию визуального редактора.
 *
 * Работает только внутри превью редактора: на сайте этих хуков в window нет,
 * и функция тихо ничего не делает. Имена глобалей задаёт сам редактор, поэтому
 * они и остаются как есть.
 */
type EditorErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type EditorEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: EditorErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: EditorEvents;
    __lovableReportRuntimeError?: (payload: {
      message: string;
      stack?: string;
      filename?: string;
    }) => void;
  }
}

export function reportRuntimeError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
  // Prod React does not rethrow boundary-caught errors to window.onerror, so the
  // editor's telemetry never sees them. Forward to the visual editor's reporting
  // hook (window.__lovable* — its own API name), present only inside the preview.
  // Loaders and server fns commonly throw a raw Response; String(it) is the
  // opaque "[object Response]", so pull out the status and URL instead.
  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  window.__lovableReportRuntimeError?.({
    message,
    ...(stack !== undefined && { stack }),
    filename: window.location.pathname,
  });
}

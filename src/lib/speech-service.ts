export type SpeechTranscript = {
  text: string;
  confidence: number;
  provider: "web-speech";
};

export type SpeechListenHandle = {
  stop: () => Promise<string>;
};

export type SpeechErrorCode = "unsupported" | "not-allowed" | "no-speech" | "failed";

export class SpeechError extends Error {
  code: SpeechErrorCode;

  constructor(code: SpeechErrorCode) {
    super(code);
    this.name = "SpeechError";
    this.code = code;
  }
}

export function speechErrorMessage(error: unknown): string {
  const code = error instanceof SpeechError ? error.code : "failed";
  if (code === "unsupported")
    return "Голосовой ввод не поддерживается этим браузером — напишите текстом";
  if (code === "not-allowed") return "Разрешите доступ к микрофону в настройках браузера";
  if (code === "no-speech") return "Ничего не расслышали — попробуйте ещё раз";
  return "Не удалось включить микрофон";
}

export interface SpeechService {
  start(): Promise<SpeechTranscript>;
  stop(): Promise<void>;
  isSupported(): boolean;
  /** Живая диктовка: текст приходит по мере речи, stop() заканчивает фразу. */
  listen(onPartial: (text: string) => void): SpeechListenHandle;
}

type RecogCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<{
          isFinal?: boolean;
          0: { transcript: string; confidence: number };
        }>;
      }) => void)
    | null;
  onerror: ((event?: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecogCtor(): RecogCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: RecogCtor;
    webkitSpeechRecognition?: RecogCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

function toCode(raw?: string): SpeechErrorCode {
  if (raw === "not-allowed" || raw === "service-not-allowed" || raw === "audio-capture")
    return "not-allowed";
  if (raw === "no-speech") return "no-speech";
  return "failed";
}

export class WebSpeechService implements SpeechService {
  private recognition: InstanceType<RecogCtor> | null = null;

  isSupported() {
    return Boolean(getRecogCtor());
  }

  async start(): Promise<SpeechTranscript> {
    const Ctor = getRecogCtor();
    if (!Ctor) throw new SpeechError("unsupported");
    return new Promise((resolve, reject) => {
      const recognition = new Ctor();
      this.recognition = recognition;
      recognition.lang = "ru-RU";
      recognition.continuous = false;
      recognition.interimResults = false;
      let settled = false;
      recognition.onresult = (event) => {
        const last = event.results[event.results.length - 1];
        const text = last?.[0]?.transcript?.trim() ?? "";
        settled = true;
        if (!text) {
          reject(new SpeechError("no-speech"));
          return;
        }
        resolve({ text, confidence: last?.[0]?.confidence ?? 0.8, provider: "web-speech" });
      };
      recognition.onerror = (event) => {
        if (settled) return;
        settled = true;
        reject(new SpeechError(toCode(event?.error)));
      };
      recognition.onend = () => {
        if (settled) return;
        settled = true;
        reject(new SpeechError("no-speech"));
      };
      try {
        recognition.start();
      } catch {
        if (!settled) {
          settled = true;
          reject(new SpeechError("failed"));
        }
      }
    });
  }

  listen(onPartial: (text: string) => void): SpeechListenHandle {
    const Ctor = getRecogCtor();
    if (!Ctor) throw new SpeechError("unsupported");
    const recognition = new Ctor();
    this.recognition = recognition;
    recognition.lang = "ru-RU";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalText = "";
    let finish: (text: string) => void = () => undefined;
    const done = new Promise<string>((resolve) => {
      let resolved = false;
      finish = (text: string) => {
        if (resolved) return;
        resolved = true;
        resolve(text);
      };
    });

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i];
        const chunk = piece?.[0]?.transcript ?? "";
        if (piece?.isFinal) finalText = `${finalText} ${chunk}`.trim();
        else interim += chunk;
      }
      onPartial(`${finalText} ${interim}`.trim());
    };
    recognition.onerror = () => finish(finalText);
    recognition.onend = () => finish(finalText);
    try {
      recognition.start();
    } catch {
      throw new SpeechError("failed");
    }

    return {
      stop: async () => {
        try {
          recognition.stop();
        } catch {
          /* already stopped */
        }
        const text = await Promise.race([
          done,
          new Promise<string>((resolve) => setTimeout(() => resolve(finalText), 1200)),
        ]);
        onPartial(text);
        return text;
      },
    };
  }

  async stop() {
    this.recognition?.stop();
  }
}

export const speechService: SpeechService = new WebSpeechService();

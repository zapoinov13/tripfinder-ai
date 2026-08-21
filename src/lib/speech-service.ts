export type SpeechTranscript = {
  text: string;
  confidence: number;
  provider: "mock" | "web-speech";
};

export type SpeechListenHandle = {
  stop: () => Promise<string>;
};

export interface SpeechService {
  start(): Promise<SpeechTranscript>;
  stop(): Promise<void>;
  isSupported(): boolean;
  /** Живая диктовка: текст приходит по мере речи, stop() заканчивает фразу. */
  listen(onPartial: (text: string) => void): SpeechListenHandle;
}

const mockText =
  "Хочу из Алматы в Дубай на 7 дней. Нас двое взрослых и двое детей 5 лет и 1 год. Бюджет до 1,5 млн тенге. Важно JBR или Marina, море рядом, трансфер, сафари и русскоязычная поддержка.";

export class MockSpeechService implements SpeechService {
  isSupported() {
    return true;
  }

  async start(): Promise<SpeechTranscript> {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return { text: mockText, confidence: 0.92, provider: "mock" };
  }

  async stop() {
    return Promise.resolve();
  }

  listen(onPartial: (text: string) => void): SpeechListenHandle {
    let stopped = false;
    const words = mockText.split(" ");
    let i = 0;
    const timer = setInterval(() => {
      if (stopped) return;
      i = Math.min(words.length, i + 3);
      onPartial(words.slice(0, i).join(" "));
      if (i >= words.length) {
        clearInterval(timer);
      }
    }, 180);
    return {
      stop: async () => {
        stopped = true;
        clearInterval(timer);
        const text = words.slice(0, Math.max(i, 8)).join(" ");
        onPartial(text);
        return text;
      },
    };
  }
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

export class WebSpeechService implements SpeechService {
  private recognition: InstanceType<RecogCtor> | null = null;

  isSupported() {
    return Boolean(getRecogCtor());
  }

  async start(): Promise<SpeechTranscript> {
    if (!this.isSupported()) {
      return new MockSpeechService().start();
    }
    const Ctor = getRecogCtor();
    return new Promise((resolve) => {
      const recognition = new Ctor!();
      this.recognition = recognition;
      recognition.lang = "ru-RU";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const last = event.results[event.results.length - 1];
        const text = last?.[0]?.transcript ?? "";
        resolve({
          text,
          confidence: last?.[0]?.confidence ?? 0.8,
          provider: "web-speech",
        });
      };
      recognition.onerror = () => {
        void new MockSpeechService().start().then(resolve);
      };
      recognition.start();
    });
  }

  listen(onPartial: (text: string) => void): SpeechListenHandle {
    if (!this.isSupported()) {
      return new MockSpeechService().listen(onPartial);
    }
    const Ctor = getRecogCtor()!;
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
      finish("");
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

function createSpeechService(): SpeechService {
  if (typeof window === "undefined") return new MockSpeechService();
  const web = new WebSpeechService();
  return web.isSupported() ? web : new MockSpeechService();
}

export const speechService: SpeechService = createSpeechService();

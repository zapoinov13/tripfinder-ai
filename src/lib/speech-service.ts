export type SpeechTranscript = {
  text: string;
  confidence: number;
  provider: "mock" | "web-speech";
};

export interface SpeechService {
  start(): Promise<SpeechTranscript>;
  stop(): Promise<void>;
  isSupported(): boolean;
}

const mockText =
  "Хочу из Алматы в Дубай на 7 дней. Нас двое взрослых и двое детей 5 лет и 1 год. Бюджет до 1,5 млн тенге. Важно всё включено, море рядом и инфраструктура вокруг.";

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
}

type RecogCtor = new () => {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export class WebSpeechService implements SpeechService {
  private recognition: InstanceType<RecogCtor> | null = null;

  isSupported() {
    if (typeof window === "undefined") return false;
    const w = window as unknown as { SpeechRecognition?: RecogCtor; webkitSpeechRecognition?: RecogCtor };
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }

  async start(): Promise<SpeechTranscript> {
    if (!this.isSupported()) {
      return new MockSpeechService().start();
    }
    const w = window as unknown as { SpeechRecognition?: RecogCtor; webkitSpeechRecognition?: RecogCtor };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    return new Promise((resolve) => {
      const recognition = new Ctor!();
      this.recognition = recognition;
      recognition.lang = "ru-RU";
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const text = event.results[0]?.[0]?.transcript ?? "";
        resolve({
          text,
          confidence: event.results[0]?.[0]?.confidence ?? 0.8,
          provider: "web-speech",
        });
      };
      recognition.onerror = () => {
        void new MockSpeechService().start().then(resolve);
      };
      recognition.start();
    });
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

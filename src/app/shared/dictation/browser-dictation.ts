/**
 * Los dos motores del dictado en el navegador (IA3):
 * - `SpeechDictation`: el reconocedor de voz del navegador (`SpeechRecognition`, en Chrome, Edge y Safari), gratis. Escribe
 *   cada frase al terminarla y vuelve a escuchar hasta que se para.
 * - `RecordedDictation`: graba un trozo para transcribirlo con la clave de IA. Mide el volumen mientras graba: sin voz
 *   no se envía, porque los modelos de transcripción se inventan frases con el silencio.
 */

interface SpeechRecognitionResultLike { isFinal: boolean; 0: { transcript: string } }
interface SpeechRecognitionEventLike { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> }
interface SpeechRecognitionLike {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function speechRecognitionConstructor(): SpeechRecognitionConstructor | null {
    const scope = globalThis as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/** Si el navegador tiene reconocedor de voz (Firefox no lo tiene). */
export function browserSpeechAvailable(): boolean {
    return !!speechRecognitionConstructor();
}

/** Si el navegador puede grabar audio para la IA. */
export function audioRecordingAvailable(): boolean {
    return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

const SPEECH_ERRORS: Record<string, string> = {
    'not-allowed': 'Para dictar, Libros necesita el micrófono. Puedes darle permiso en la barra del navegador.',
    'service-not-allowed': 'Este navegador no deja dictar aquí.',
    'audio-capture': 'No se encuentra ningún micrófono.',
    network: 'El dictado del navegador necesita conexión.'
};

export class SpeechDictation {
    private recognition: SpeechRecognitionLike | null = null;
    private active = false;

    constructor(private readonly onText: (text: string) => void, private readonly onEnd: (message: string | null) => void) { }

    start(): void {
        const Recognition = speechRecognitionConstructor();
        if (!Recognition) {
            this.onEnd('Este navegador no tiene dictado. Prueba en Chrome o Edge, o dicta con tu clave de IA.');
            return;
        }
        const recognition = new Recognition();
        recognition.lang = 'es-ES';
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = event => {
            for (let index = event.resultIndex; index < event.results.length; index++) {
                const result = event.results[index];
                if (result.isFinal && result[0].transcript.trim()) this.onText(result[0].transcript);
            }
        };
        recognition.onerror = event => {
            // Un silencio largo no corta el dictado; lo demás, sí.
            if (event.error === 'no-speech' || event.error === 'aborted') return;
            this.active = false;
            this.onEnd(SPEECH_ERRORS[event.error] ?? 'El dictado se ha cortado. Prueba otra vez.');
        };
        // El navegador para solo tras un silencio: mientras la persona no pare, se vuelve a escuchar.
        recognition.onend = () => {
            if (this.active) {
                try { recognition.start(); } catch { this.finish(null); }
            } else {
                this.finish(null);
            }
        };
        this.recognition = recognition;
        this.active = true;
        recognition.start();
    }

    /** Termina la frase que se esté diciendo (llega en `onresult`) y no vuelve a escuchar. */
    stop(): void {
        this.active = false;
        this.recognition?.stop();
    }

    cancel(): void {
        this.active = false;
        this.recognition?.abort();
        this.recognition = null;
    }

    private finish(message: string | null): void {
        this.recognition = null;
        this.onEnd(message);
    }
}

export interface Recording {
    audio: Blob;
    heardVoice: boolean;
}

export class RecordedDictation {
    /** Tres minutos por trozo: de sobra para dictar y lejos de los 10 MB de la API. */
    static readonly MAX_MS = 180_000;
    /** El pico (de 0 a 1) por debajo del cual se toma por silencio: una voz cerca pasa de 0,1. */
    static readonly VOICE_THRESHOLD = 0.05;

    private recorder: MediaRecorder | null = null;
    private stream: MediaStream | null = null;
    private context: AudioContext | null = null;
    private meter: ReturnType<typeof setInterval> | null = null;
    private limit: ReturnType<typeof setTimeout> | null = null;
    private chunks: Blob[] = [];
    private peak = 0;
    private finished: ((recording: Recording | null) => void) | null = null;

    constructor(private readonly onLimit: () => void) { }

    async start(): Promise<void> {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
            .find(candidate => MediaRecorder.isTypeSupported?.(candidate));
        this.recorder = type ? new MediaRecorder(this.stream, { mimeType: type }) : new MediaRecorder(this.stream);
        this.chunks = [];
        this.peak = 0;
        this.recorder.ondataavailable = event => { if (event.data.size) this.chunks.push(event.data); };
        this.recorder.onstop = () => {
            const audio = new Blob(this.chunks, { type: this.recorder?.mimeType || type || 'audio/webm' });
            const done = this.finished;
            this.release();
            done?.(audio.size ? { audio, heardVoice: this.peak >= RecordedDictation.VOICE_THRESHOLD } : null);
        };
        this.measure(this.stream);
        this.recorder.start();
        this.limit = setTimeout(() => this.onLimit(), RecordedDictation.MAX_MS);
    }

    /** Para y devuelve lo grabado (null si no se grabó nada). */
    stop(): Promise<Recording | null> {
        if (!this.recorder || this.recorder.state === 'inactive') {
            this.release();
            return Promise.resolve(null);
        }
        return new Promise(resolve => {
            this.finished = resolve;
            this.recorder?.stop();
        });
    }

    cancel(): void {
        this.finished = null;
        if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
        this.release();
    }

    private measure(stream: MediaStream): void {
        const AudioContextConstructor = globalThis.AudioContext
            ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextConstructor) {
            // Sin forma de medir, se da por hecho que hubo voz.
            this.peak = 1;
            return;
        }
        this.context = new AudioContextConstructor();
        const analyser = this.context.createAnalyser();
        analyser.fftSize = 1024;
        this.context.createMediaStreamSource(stream).connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);
        this.meter = setInterval(() => {
            analyser.getByteTimeDomainData(samples);
            for (const sample of samples) this.peak = Math.max(this.peak, Math.abs(sample - 128) / 128);
        }, 150);
    }

    private release(): void {
        if (this.meter) clearInterval(this.meter);
        if (this.limit) clearTimeout(this.limit);
        this.meter = this.limit = null;
        this.stream?.getTracks().forEach(track => track.stop());
        this.stream = null;
        void this.context?.close().catch(() => undefined);
        this.context = null;
        this.recorder = null;
    }
}

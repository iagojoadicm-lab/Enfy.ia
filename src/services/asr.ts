import pino from "pino";

const logger = pino({ name: "asr" });

interface TranscriptionResult {
  transcript: string;
  transcriptId: string;
  timestamps: Array<{ start: number; end: number; text: string }>;
}

export async function transcribeAudio(audioUrl: string): Promise<TranscriptionResult> {
  logger.info({ audioUrl }, "Transcrevendo áudio");

  // Placeholder: replace with Whisper or compatible provider.
  return {
    transcript: "Paciente relata ferida em região sacral com secreção serosa.",
    transcriptId: `transcript-${Date.now()}`,
    timestamps: [
      { start: 0, end: 5, text: "Paciente relata ferida" },
      { start: 5, end: 10, text: "em região sacral" }
    ]
  };
}

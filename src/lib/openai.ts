import OpenAI from "openai";
import Replicate from "replicate";

interface WhisperSegment {
  text: string;
  start: number;
  end: number;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

interface ReplicateWhisperOutput {
  text: string;
  segments: WhisperSegment[];
  language: string;
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY environment variable");
}

if (!process.env.REPLICATE_API_TOKEN) {
  throw new Error("Missing REPLICATE_API_TOKEN environment variable");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function transcribeAudio(audioFile: File): Promise<string> {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "text",
    });

    return transcription;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw new Error("Failed to transcribe audio");
  }
}

export async function transcribeAudioWithTimestamps(audioFile: File) {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    return transcription;
  } catch (error) {
    console.error("Error transcribing audio with timestamps:", error);
    throw new Error("Failed to transcribe audio with timestamps");
  }
}

export async function transcribeAudioReplicate(audioFile: File) {
  try {
    // Convert File to a data URL that Replicate can access
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${audioFile.type};base64,${base64}`;

    const output = (await replicate.run(
      "openai/whisper:8099696689d249cf8b122d833c36ac3f75505c666a395ca40ef26f68e7d3d16e",
      {
        input: {
          audio: dataUrl,
          language: "auto",
          translate: false,
          temperature: 0,
          transcription: "plain text",
          suppress_tokens: "-1",
          logprob_threshold: -1,
          no_speech_threshold: 0.6,
          condition_on_previous_text: true,
          compression_ratio_threshold: 2.4,
          temperature_increment_on_fallback: 0.2,
        },
      }
    )) as ReplicateWhisperOutput;

    // Extract text and segments from the output
    const text =
      output.segments
        ?.map((segment: WhisperSegment) => segment.text)
        .join("") || "";

    return {
      text: text.trim(),
      segments: output.segments || [],
    };
  } catch (error) {
    console.error("Error transcribing audio with Replicate:", error);
    throw new Error("Failed to transcribe audio with Replicate");
  }
}

export default openai;

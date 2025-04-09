import * as googleTTS from "google-tts-api";
import Stream from "stream";

interface Options {
  lang?: string;
  slow?: boolean;
  host?: string;
  timeout?: number;
}

function base64toBinaryStream(base64Text: string) {
  const audioBinaryStream = new Stream.Readable();
  audioBinaryStream.push(Buffer.from(base64Text, "base64"));
  audioBinaryStream.push(null);
  return audioBinaryStream;
}

export async function getVoiceStream(
  text: string,
  {
    lang = "en",
    slow = false,
    host = "https://translate.google.com",
    timeout = 10000
  }: Options = {}
) {
  const stream = new Stream.PassThrough();

  const base64 = await googleTTS.getAudioBase64(text, {
    lang,
    slow,
    host,
    timeout
  });

  const audioBinaryStream = base64toBinaryStream(base64);

  audioBinaryStream.pipe(stream);

  return stream;
}

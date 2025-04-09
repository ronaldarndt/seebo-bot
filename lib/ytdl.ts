import ytdl from "@distube/ytdl-core";
import prism from "prism-media";
import Stream from "stream";
import fs from "fs";

const agent = ytdl.createAgent(
  JSON.parse(fs.readFileSync("cookies.json", { encoding: "utf8" }))
);

function filter(format: ytdl.videoFormat) {
  return (
    format.codecs === "opus" &&
    format.container === "webm" &&
    format.audioSampleRate === "48000"
  );
}

function nextBestFormat(formats: ytdl.videoFormat[], isLive: boolean) {
  let filter = (format: ytdl.videoFormat) => !!format.audioBitrate;

  if (isLive)
    filter = (format: ytdl.videoFormat) =>
      !!format.audioBitrate && !!format.isHLS;

  formats = formats
    .filter(filter)
    .sort((a, b) => Number(b.audioBitrate) - Number(a.audioBitrate));

  return formats.find(format => !format.bitrate) || formats[0];
}

export async function download(
  url: string,
  options: ytdl.downloadOptions = {}
) {
  const info = await ytdl.getInfo(url, { agent });

  const format = info.formats.find(filter);

  const canDemux = format && info.videoDetails.lengthSeconds !== "0";

  if (canDemux) options = { ...options, filter };
  else if (info.videoDetails.lengthSeconds !== "0")
    options = { ...options, filter: "audioonly" };

  let stream;

  if (canDemux) {
    const demuxer = new prism.opus.WebmDemuxer();
    const downloadStream = ytdl.downloadFromInfo(info, { ...options, agent });
    downloadStream.pipe(demuxer);
    stream = demuxer;
  } else {
    const bestFormat = nextBestFormat(
      info.formats,
      info.videoDetails.isLiveContent
    );
    if (!bestFormat) throw new Error("No suitable format found");
    const transcoder = new prism.FFmpeg({
      args: [
        "-reconnect",
        "1",
        "-reconnect_streamed",
        "1",
        "-reconnect_delay_max",
        "5",
        "-i",
        bestFormat.url,
        "-analyzeduration",
        "0",
        "-loglevel",
        "0",
        "-f",
        "s16le",
        "-ar",
        "48000",
        "-ac",
        "2"
      ],
      shell: false
    });
    const opus = new prism.opus.Encoder({
      rate: 48000,
      channels: 2,
      frameSize: 960
    });
    transcoder.pipe(opus);
    stream = opus;
  }

  return stream as Stream.Readable;
}

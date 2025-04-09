import { AudioPlayer } from "@discordjs/voice";
import { Collection } from "discord.js";
import { getBasicInfo, validateURL } from "ytdl-core-discord";
import ytsr from "@distube/ytsr";

export interface Video {
  url: string;
  title: string;
}

interface GuildPlayer {
  player: AudioPlayer;
  queue: Array<Video>;
}

class VideoQueueService {
  private guilds = new Collection<string, GuildPlayer>();

  create(guildId: string, player: AudioPlayer) {
    this.guilds.set(guildId, {
      player,
      queue: []
    });
  }

  remove(guildId: string) {
    this.guilds.delete(guildId);
  }

  has(guildId: string) {
    return this.guilds.has(guildId);
  }

  skip(guildId: string) {
    const guild = this.get(guildId);

    guild.player.stop(true);
  }

  async searchAsync(songName: string): Promise<Video> {
    if (validateURL(songName)) {
      const info = await getBasicInfo(songName);

      return {
        url: info.videoDetails.video_url,
        title: info.videoDetails.title
      };
    }

    const info = await ytsr(songName, { limit: 5, safeSearch: false });

    const item = info.items.find(x => x.type === "video");

    if (!item) {
      throw new Error("Nenhum resultado encontrado");
    }

    return {
      url: item.url,
      title: item.name
    };
  }

  add(guildId: string, song: Video) {
    const guild = this.get(guildId);

    guild.queue.unshift(song);
  }

  pop(guildId: string) {
    const guild = this.get(guildId);

    return guild.queue.pop();
  }

  private get(guildId: string) {
    return this.guilds.get(guildId)!;
  }
}

export default new VideoQueueService();

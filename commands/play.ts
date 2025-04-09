import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder
} from "discord.js";
import {
  AudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnectionStatus,
  joinVoiceChannel,
  AudioPlayerStatus,
  VoiceConnection
} from "@discordjs/voice";
import VideoQueueService, { Video } from "../services/queue";
import { download } from "../lib/ytdl";
import fs from "fs";

class PlayCommand {
  constructor(private interaction: ChatInputCommandInteraction) {}

  public async execute() {
    const { member, options, guildId } = this.interaction;

    const isInVoiceChannel =
      !!member && "voice" in member && !!member.voice.channel;

    if (!isInVoiceChannel || !guildId) {
      await this.interaction.reply({
        content: "Você deve estar em um canal de voz.",
        flags: [MessageFlags.Ephemeral]
      });

      return;
    }

    await this.interaction.deferReply();

    const name = options.getString("nome", true);
    const song = await VideoQueueService.searchAsync(name);

    if (VideoQueueService.has(guildId)) {
      VideoQueueService.add(guildId, song);

      return this.interaction.editReply(
        'Adicionado na fila "' + song.title + '"'
      );
    }

    const player = new AudioPlayer();
    VideoQueueService.create(guildId, player);

    const connection = joinVoiceChannel({
      channelId: member.voice.channelId!,
      guildId: this.interaction.guildId!,
      adapterCreator: this.interaction.guild?.voiceAdapterCreator!
    });

    connection.subscribe(player);
    this.setupHandlers(connection, player);
    this.play(player, song);
  }

  private stop(
    connection: VoiceConnection,
    player: AudioPlayer,
    guildId: string
  ) {
    connection.destroy();
    player.stop();
    VideoQueueService.remove(guildId);
  }

  private async play(player: AudioPlayer, song: Video) {
    this.sendOrEditReply('Tocando "' + song.title + '"');

    const readable = await download(song.url, {
      highWaterMark: 1 << 25,
      quality: "highestaudio",
      lang: "pt-BR"
    });

    const resource = createAudioResource(readable);

    player.play(resource);
  }

  private async sendOrEditReply(message: string) {
    if (this.interaction.replied) {
      if (!this.interaction.channel?.isSendable()) return;

      return this.interaction.channel?.send(message);
    }

    return this.interaction.editReply(message);
  }

  private setupHandlers(connection: VoiceConnection, player: AudioPlayer) {
    player.on(AudioPlayerStatus.Idle, async () => {
      const song = VideoQueueService.pop(this.interaction.guildId!);

      if (!song) {
        this.stop(connection, player, this.interaction.guildId!);
        return;
      }

      this.play(player, song);
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5000)
        ]);
      } catch {
        this.stop(connection, player, this.interaction.guildId!);
      }
    });
  }
}

export const data = new SlashCommandBuilder()
  .setName("play")
  .addStringOption(o =>
    o
      .setName("nome")
      .setDescription(
        "O nome da música ou a url do vídeo que você quer que eu toque"
      )
      .setRequired(true)
  )
  .setDescription("Toca música!");

export async function execute(interaction: ChatInputCommandInteraction) {
  await new PlayCommand(interaction).execute();
}

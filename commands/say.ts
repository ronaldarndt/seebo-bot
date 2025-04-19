import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import {
  AudioPlayer,
  createAudioResource,
  StreamType,
  entersState,
  VoiceConnectionStatus,
  joinVoiceChannel,
  getVoiceConnection,
  AudioPlayerStatus
} from "@discordjs/voice";
import { getVoiceStream } from "../lib/tts";

export const data = new SlashCommandBuilder()
  .setName("say")
  .addStringOption(o =>
    o
      .setName("texto")
      .setDescription("O texto que você quer que eu fale")
      .setRequired(true)
  )
  .addStringOption(o =>
    o.setName("idioma").setDescription("O idioma do texto").setRequired(false)
  )
  .setDescription("Fala o que você digitar!");

const audioPlayer = new AudioPlayer();

export async function execute(interaction: ChatInputCommandInteraction) {
  let voiceConnection = getVoiceConnection(interaction.guildId!);

  const isDisconnected =
    voiceConnection?.state.status === VoiceConnectionStatus.Disconnected;

  if (
    (!voiceConnection || isDisconnected) &&
    interaction.member &&
    "voice" in interaction.member
  ) {
    voiceConnection = joinVoiceChannel({
      channelId: interaction.member.voice.channelId!,
      guildId: interaction.guildId!,
      adapterCreator: interaction.guild?.voiceAdapterCreator!
    });

    voiceConnection = await entersState(
      voiceConnection,
      VoiceConnectionStatus.Ready,
      5_000
    );
  }

  if (voiceConnection?.state.status === VoiceConnectionStatus.Ready) {
    try {
      const stream = await getVoiceStream(
        interaction.options.getString("texto", true),
        {
          lang: interaction.options.getString("idioma", false) || "pt"
        }
      );
      const audioResource = createAudioResource(stream, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true
      });

      voiceConnection.subscribe(audioPlayer);
      audioPlayer.play(audioResource);

      interaction.reply("Falando!");
    } catch (error) {
      console.log("error", error);
      interaction.reply("Erro ao falar o texto!");
      voiceConnection.disconnect();
    }
  }

  audioPlayer?.on("stateChange", (oldState, newState) => {
    if (newState.status === AudioPlayerStatus.Idle) {
      voiceConnection?.disconnect();
    }
  });
}

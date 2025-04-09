import { ADS, GenericModule } from "@neuralnexus/ampapi";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("amp")
  .addSubcommandGroup(o =>
    o
      .setName("instances")
      .setDescription("Comandos relacionados às instâncias")
      .addSubcommand(s =>
        s.setName("list").setDescription("Lista as instâncias disponíveis")
      )
      .addSubcommand(s =>
        s
          .setName("info")
          .addStringOption(opt =>
            opt
              .setName("id")
              .setDescription("ID da instância")
              .setRequired(true)
          )
          .setDescription("Mostra informações sobre uma instância")
      )
  )
  .setDescription("Comandos relacionados ao amp");

const api = new ADS(
  "https://amp.ronaldarndt.dev",
  "admin",
  process.env.AMP_PASSWORD
);

export async function execute(interaction: ChatInputCommandInteraction) {
  await api.APILogin();

  const group = interaction.options.getSubcommandGroup();

  if (group === "instances") {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "list") {
      await listInstances(interaction);
    } else if (subcommand === "info") {
      await instanceInfo(interaction);
    } else {
      await interaction.reply("Comando inválido.");
    }
  } else {
    await interaction.reply("Comando inválido.");
  }
}

async function listInstances(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const [target] = await api.ADSModule.GetInstances();
  const instances = target.AvailableInstances.filter(x => x.Module !== "ADS");

  let instanceList = "Instâncias do AMP:\n";

  await interaction.editReply(instanceList);

  for (const instance of instances) {
    instanceList += `- ${instance.FriendlyName} (Game: ${instance.ModuleDisplayName}) (${instance.InstanceID})\n`;
    instanceList += `  - (Cpu usage: ${instance.Metrics["CPU Usage"]?.Percent}%) (Memory usage: ${instance.Metrics["Memory Usage"]?.Percent}%)\n`;

    await interaction.editReply(instanceList);
  }
}

async function instanceInfo(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const instanceId = interaction.options.getString("id", true);
  const [target] = await api.ADSModule.GetInstances();

  const instance = target.AvailableInstances.find(
    i => i.InstanceID === instanceId
  );

  if (!instance) {
    await interaction.editReply("Instância não encontrada.");
    return;
  }

  let instanceInfo = `Instância: ${instance.FriendlyName}\n`;
  instanceInfo += `ID: ${instance.InstanceID}\n`;
  instanceInfo += `Módulo: ${instance.ModuleDisplayName}\n`;

  await interaction.editReply(instanceInfo);

  instanceInfo += "Lista de jogadores:\n";
  await interaction.editReply(instanceInfo);

  const instanceModule = await api.InstanceLogin<GenericModule>(
    instance.InstanceID,
    instance.Module
  );

  const players = await instanceModule.Core.GetUserList();

  for (const player in players) {
    instanceInfo += `- ${player} `;
    await interaction.editReply(instanceInfo);

    const playerInfo = await instanceModule.Core.GetUserInfo(player);
    const joinTime = playerInfo.JoinTime;
    const joinDate = new Date(joinTime);

    instanceInfo += `(Jogando desde ${joinDate.toLocaleString()})\n`;
    await interaction.editReply(instanceInfo);
  }
}

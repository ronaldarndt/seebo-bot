import "dotenv/config";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { deployCommands } from "./deploy-commands";
import { commands } from "./commands";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.once(Events.ClientReady, async readyClient => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  await deployCommands();
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isCommand() || !interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName as keyof typeof commands;

  commands[commandName]?.execute(interaction);
});

client.login(process.env.DISCORD_TOKEN);

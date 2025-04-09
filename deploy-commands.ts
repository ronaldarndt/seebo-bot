import { REST, Routes } from "discord.js";
import { commands } from "./commands";

const commandsData = Object.values(commands).map(command => command.data);

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

export async function deployCommands() {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID!),
      {
        body: commandsData
      }
    );

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
}

import { Client, Collection, Intents } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import dotenv from "dotenv"
import path from "node:path"
import fs from "node:fs"

dotenv.config();

type commandType = {
  data: SlashCommandBuilder,
  execute(): void
}

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const commands = new Collection<any, any>();

async function setCommands(){
  const commandsPath = path.join(__dirname, "commands");
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".ts") || file.endsWith(".js"));
  try {
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command: commandType = require(filePath);
      commands.set(command.data.name, command);
    }
    console.log("All commands are setted!");
  } catch (error) {
    console.error("Failed to set command: ", error);
  }
}

client.on('interactionCreate', async interaction =>{
  if (!interaction.isCommand()) return;
  
  const command = commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}

})

client.once('ready', async () =>{
  await setCommands();
  console.log('Casino bot is running!');
});

client.login(process.env.DISCORD_API_TOKEN);
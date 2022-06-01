import fs from 'node:fs';
import path from 'node:path';
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import dotenv from "dotenv";

dotenv.config();

const token = process.env.DISCORD_API_TOKEN;
const clientId = process.env.DISCORD_BOT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

console.log(token, clientId, guildId);

if(token && clientId && guildId){
  const rest = new REST().setToken(token);

  const commands = [];
  const commandsPath = path.join(__dirname, "commands");
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".ts") || file.endsWith(".js"));
  
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    commands.push(command.data.toJSON());
  }

  rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
  .then(() => console.log("Comandos registrados com sucesso no servidor!"))
  .catch(console.error);
}else{
  console.log("Alguma variável de ambiente está faltando, verifique o .env!");
}
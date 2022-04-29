import { SlashCommandBuilder } from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import dotenv from "dotenv";

dotenv.config();

const token = process.env.DISCORD_API_TOKEN;
const clientId = process.env.DISCORD_BOT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

console.log(token, clientId, guildId);

const commands = [
  new SlashCommandBuilder().setName('bj').setDescription("Inicia uma partida de Blackjack com o BOT"),
  new SlashCommandBuilder().setName('daily').setDescription("Resgate suas fichas diárias."),
].map(command => command.toJSON());

if(token && clientId && guildId){
  const rest = new REST().setToken(token);

  rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
  .then(() => console.log("Comandos registrados com sucesso no servidor!"))
  .catch(console.error);
}else{
  console.log("Alguma variável de ambiente está faltando, verifique o .env!");
}
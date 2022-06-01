import { SlashCommandBuilder } from '@discordjs/builders';
import { User } from '@prisma/client';
import { CommandInteraction, MessageEmbed } from 'discord.js';
import prismaService from '../services/prisma-service';

export = {
  data: new SlashCommandBuilder().setName("me").setDescription("Verifique seus status no casino"),
  async execute(interaction: CommandInteraction) {
    let user = await prismaService.user.findFirst(
      { where: {
        discordId: interaction.user.id,
      }}
    );

    if(!user){
      await interaction.reply("Utilize o comando /daily para poder utilizar os comandos do casino.");
      return;
    }
    
    const statusEmbed = await generateStatusEmbed(user, ""+interaction.user.avatarURL());
    await interaction.reply({embeds: [statusEmbed]});
  }
}

async function generateStatusEmbed(user: User, avatarUrl: string){
  return new MessageEmbed()
    .setColor('GOLD')
    .setTitle(user.name)
    .setThumbnail(avatarUrl)
    .addField("Fichas", `${user.chips} :coin:`);
}
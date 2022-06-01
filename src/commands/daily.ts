import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import moment from "moment";
import 'moment/locale/pt-br'
import prismaService from "../services/prisma-service";
moment.locale("pt-br");

export = {
  data: new SlashCommandBuilder().setName('daily').setDescription("Resgate suas fichas diárias."), 

  async execute(interaction: CommandInteraction){
    let user = await prismaService.user.findFirst(
      { where: {
        discordId: interaction.user.id,
      }}
    );

      
    if(!user) {
      user = await prismaService.user.create({
        data: {
          discordId: interaction.user.id,
          chips: 100,
          name: interaction.user.username,
          nextDaily: moment().add(1, 'days').utcOffset(0, true).format(),
        }
      });

      await interaction.reply("Nova conta criada! Você tem agora 100 fichas para jogar!\nVolte novamente todos os dias às 00:00 para resgatar sua diária novamente!");
      return;
    }

    if(moment(user.nextDaily).isBefore(moment().format())) {
      await prismaService.user.update({
        where: {
          discordId: user.discordId,
        },
        data: {
          chips: user.chips += 50,
          nextDaily: moment().add(1, 'days').utcOffset(0, true).format()
        }
      });

      await interaction.reply("Você resgatou 50 fichas!\nVolte novamente todos os dias às 00:00 para resgatar sua diária novamente!");
      return;
    }

    await interaction.reply("Você já resgatou sua diária!");
    return;
  }
}
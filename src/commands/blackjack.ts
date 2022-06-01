import { MessageActionRow, MessageButton, MessageComponentInteraction, MessageEmbed } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { User } from '@prisma/client';
import { CommandInteraction } from 'discord.js';
import { generateDeck, Player, shuffle } from '../games/Blackjack';
import { setTimeout } from "timers/promises"
import prismaService from '../services/prisma-service';

enum embedTypes {
  WIN,
  TIE,
  LOSE,
  ROUND
}

function formatCardMessage(player: Player){
  let formatedMessage = "";

  formatedMessage = player.getCards()?.map(card => suitParser(card)).join("   ");

  return formatedMessage+"\nValor: "+player.getPoints();
}

function suitParser(card:string | undefined) {
  return card?.replace("C", " :clubs:")
  .replace("S", " :spades:")
  .replace("H", " :hearts:")
  .replace("D", " :diamonds:")
}

async function generateEmbed(type: embedTypes, player: Player, dealer: Player, user: User, chips: number){
  let embed: MessageEmbed;

  switch(type){
    case embedTypes.ROUND:
      embed = new MessageEmbed().setColor("DARK_PURPLE").setTitle("BLACKJACK!")
      .addField("Player Hand: ",formatCardMessage(player), true)
      .addField("\u200B","\u200B", true)
      .addField("Dealer Hand: ",formatCardMessage(dealer), true);
      break;
    case embedTypes.WIN:
      await prismaService.user.update({ data: { chips: user.chips += chips * 2 }, where: { discordId: user.discordId } });

      embed = new MessageEmbed().setColor("DARK_GREEN").setTitle("BLACKJACK!")
      .addField("Player Hand: ",formatCardMessage(player), true)
      .addField("\u200B","\u200B", true)
      .addField("Dealer Hand: ",formatCardMessage(dealer), true)
      .addField("Você venceu",`Foram despositados ${chips * 2} fichas na sua conta.`, false)
      break;
    case embedTypes.TIE:
      embed = new MessageEmbed().setColor("DARKER_GREY").setTitle("BLACKJACK!")
      .addField("Player Hand: ",formatCardMessage(player), true)
      .addField("\u200B","\u200B", true)
      .addField("Dealer Hand: ",formatCardMessage(dealer), true)
      .addField("Empate",`As fichas apostadas (${chips}) retornaram a sua conta.`, false)
      break;
    case embedTypes.LOSE:
      await prismaService.user.update({ data: { chips: user.chips -= chips }, where: { discordId: user.discordId } });

      embed = new MessageEmbed().setColor("DARK_RED").setTitle("BLACKJACK!")
      .addField("Player Hand: ",formatCardMessage(player), true)
      .addField("\u200B","\u200B", true)
      .addField("Dealer Hand: ",formatCardMessage(dealer), true)
      .addField("Você perdeu",`Você perdeu ${chips} fichas.`, false)
      break;
  }

  return embed;
}

async function checkResults(player: Player, dealer: Player, chips: number, i: MessageComponentInteraction, user: User){
  let embed: MessageEmbed;

  await i.deferUpdate();
  if(player.getPoints() === dealer.getPoints()) {
    embed = await generateEmbed(embedTypes.TIE, player, dealer, user, chips);
    await i.editReply({ content: "BUST", embeds: [embed], components: []  });
  } else if(player.getPoints() > dealer.getPoints() || dealer.getPoints() === 21){
    embed = await generateEmbed(embedTypes.LOSE, player, dealer, user, chips);
    await i.editReply({ content: "LOST", embeds: [embed], components: []  });
  } else {
    embed = await generateEmbed(embedTypes.WIN, player, dealer, user, chips);
    await i.editReply({ content: "WIN", embeds: [embed], components: []  });
  }
}

async function playerTurn(player: Player, dealer: Player, chips: number, i: MessageComponentInteraction, row: MessageActionRow, colector: any, user: User){
  let embed: MessageEmbed;

  await i.deferUpdate();
  if(player.getPoints() <= 21){
    embed = await generateEmbed(embedTypes.ROUND, player, dealer, user, chips);
    await i.editReply({ content: "HIT", embeds: [embed], components: [row] });
  }else{
    embed = await generateEmbed(embedTypes.LOSE, player, dealer, user, chips);
    await i.editReply({ content: "LOST", embeds: [embed], components: []  });

    colector.stop();
  }
}

export = {
  data: new SlashCommandBuilder()
  .setName('bj')
  .setDescription("Inicia uma partida de Blackjack com o BOT")
  .addIntegerOption(option => option.setName("fichas").setDescription("Número de fichas que você deseja apostar").setMinValue(1).setRequired(true)),

  async execute(interaction: CommandInteraction) {
    const optionArgument = interaction.options.getInteger("fichas")?.valueOf();
    let bettedChips = 0;

    if(optionArgument === undefined || optionArgument < 1){
      await interaction.reply("O número de fichas precisa ser maior que 1.");
      return;
    } else {
      bettedChips = optionArgument;
    }
    
    let user = await prismaService.user.findFirst({ 
      where: {
        discordId: interaction.user.id,
      }
    }) as User;

    if (user) {
      if(user.chips < bettedChips){
        await interaction.reply("Você não tem a quantidade de fichas suficientes!");
        return;
      }
    } else {
      await interaction.reply("Você ainda não possui fichas, utilize o comando /daily para começar a apostar!");
      return;
    }
    let deck = await generateDeck();
    deck = await shuffle(deck);
  
    let player = new Player([deck.pop(), deck.pop()]);
    let dealer = new Player([deck.pop(), deck.pop()]);

    const row = new MessageActionRow()
    .addComponents(
      new MessageButton().setCustomId('hit').setLabel('Hit').setStyle('PRIMARY'),
      new MessageButton().setCustomId('stay').setLabel('Stay').setStyle('SECONDARY')
    );

    let embed = await generateEmbed(embedTypes.ROUND, player, dealer, user, bettedChips);

    if(player.getPoints() === 21 && dealer.getPoints() === 21) {
      embed = await generateEmbed(embedTypes.TIE, player, dealer, user, bettedChips);
      await interaction.reply({ embeds: [embed] });
    } else {
      await interaction.reply({ embeds: [embed], components: [row] });
    }

    const collector = await interaction.channel?.createMessageComponentCollector(
      { 
        filter: i => (i.customId === 'hit' || i.customId === 'stay') && i.user.id === interaction.user.id,
        time: 1000 * 30,
      }
    );

    collector?.on('collect', async i =>{
      if (i.customId === "hit") {
        player.hit(deck);
        await playerTurn(player, dealer, bettedChips, i, row, collector, user);
      }else{
        while(dealer.getPoints() <= player.getPoints() || dealer.getPoints() < 21){
          dealer.hit(deck);
        }
        await checkResults(player, dealer, bettedChips, i, user);
        collector.stop();
      }
    })

    collector?.on('end', async c =>{
      await setTimeout(1000 * 15);
      await interaction.deleteReply();
    });
  }
}

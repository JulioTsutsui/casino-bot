import { Client, Intents, MessageActionRow, MessageButton, MessageComponentInteraction, MessageEmbed } from "discord.js";
import { setTimeout } from "timers/promises"
import dotenv from "dotenv"
import { generateDeck, Player, shuffle } from "./games/Blackjack";
import { PrismaClient } from '@prisma/client'

dotenv.config();

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
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

function generateEmbed(type: embedTypes, player: Player, dealer: Player, chips: number){
  let embed: MessageEmbed;
  switch(type){
    case embedTypes.ROUND:
      embed = new MessageEmbed().setColor("DARK_PURPLE").setTitle("BLACKJACK!")
      .addField("Player Hand: ",formatCardMessage(player), true)
      .addField("\u200B","\u200B", true)
      .addField("Dealer Hand: ",formatCardMessage(dealer), true);
      break;
    case embedTypes.WIN:
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
      embed = new MessageEmbed().setColor("DARK_RED").setTitle("BLACKJACK!")
      .addField("Player Hand: ",formatCardMessage(player), true)
      .addField("\u200B","\u200B", true)
      .addField("Dealer Hand: ",formatCardMessage(dealer), true)
      .addField("Você perdeu",`Você perdeu ${chips} fichas.`, false)
      break;
  }

  return embed;
}

client.on('interactionCreate', async interaction =>{
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if(commandName === 'bj') {
    let deck = await generateDeck();
    deck = await shuffle(deck);
  
    let player = new Player([deck.pop(), deck.pop()]);
    let dealer = new Player([deck.pop(), deck.pop()]);

    const row = new MessageActionRow()
    .addComponents(
      new MessageButton().setCustomId('hit').setLabel('Hit').setStyle('PRIMARY'),
      new MessageButton().setCustomId('stay').setLabel('Stay').setStyle('SECONDARY')
    );

    let chips = 10;
    let embed = generateEmbed(embedTypes.ROUND, player, dealer, chips);

    if(player.getPoints() === 21 && dealer.getPoints() === 21) {
      embed = generateEmbed(embedTypes.TIE, player, dealer, chips);
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

        await playerTurn(player, dealer, 10, i, row, collector);
      }else{
        while(dealer.getPoints() <= player.getPoints() || dealer.getPoints() < 21){
          dealer.hit(deck);
        }
        await checkResults(player, dealer, 10, i, row);
        collector.stop();
      }
    })

    collector?.on('end', async c =>{
      await setTimeout(1000 * 15);
      await interaction.deleteReply();
    });
  } else if (commandName === 'daily') {
    const prisma = new PrismaClient();
    let user = await prisma.user.findFirst(
      { where: {
        discordId: interaction.user.id,
      }}
    )

    if(!user) {
      user = await prisma.user.create({
        data: {
          discordId: interaction.user.id,
          chips: 100,
          name: interaction.user.username,
          nextDaily: new Date(new Date().getDate() + 1)
        }
      });

      await interaction.reply("Nova conta criada! Você tem agora 100 fichas para jogar!\nVolte novamente todos os dias às 00:00 para resgatar sua diária novamente!");
      await prisma.$disconnect();
      return;
    }

    if(user.nextDaily <= new Date(new Date().getDate())) {
      user.nextDaily = new Date(new Date().getDate() + 1)
      
      await prisma.user.update({
        where: {
          discordId: user.discordId,
        },
        data: {
          chips: user.chips += 50
        }
      });

      await interaction.reply("Você resgatou 50 fichas!\nVolte novamente todos os dias às 00:00 para resgatar sua diária novamente!");
      await prisma.$disconnect();
      return;
    }

    await interaction.reply("Você já resgatou sua diária!");
    await prisma.$disconnect();
    return;
  }
})

async function checkResults(player: Player, dealer: Player, chips: number, i: MessageComponentInteraction, row: MessageActionRow){
  let embed: MessageEmbed;

  await i.deferUpdate();
  if(player.getPoints() === dealer.getPoints()) {
    embed = generateEmbed(embedTypes.TIE, player, dealer, chips);
    await i.editReply({ content: "BUST", embeds: [embed], components: []  });
  } else if(player.getPoints() > dealer.getPoints() || dealer.getPoints() === 21){
    embed = generateEmbed(embedTypes.LOSE, player, dealer, chips);
    await i.editReply({ content: "LOST", embeds: [embed], components: []  });
  } else {
    embed = generateEmbed(embedTypes.WIN, player, dealer, chips);
    await i.editReply({ content: "WIN", embeds: [embed], components: []  });
  }
}

async function playerTurn(player: Player, dealer: Player, chips: number, i: MessageComponentInteraction, row: MessageActionRow, colector: any){
  let embed: MessageEmbed;

  await i.deferUpdate();
  if(player.getPoints() < 21){
    embed = generateEmbed(embedTypes.ROUND, player, dealer, chips);
    await i.editReply({ content: "HIT", embeds: [embed], components: [row] });
  }else{
    embed = generateEmbed(embedTypes.LOSE, player, dealer, chips);
    await i.editReply({ content: "LOST", embeds: [embed], components: []  });

    colector.stop();
  }
}

client.once('ready', () =>{
  console.log('Casino bot is running!');
});

client.login(process.env.DISCORD_API_TOKEN);
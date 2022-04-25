import { ButtonInteraction, CacheType, Client, Intents, InteractionCollector, MessageActionRow, MessageButton, MessageComponentInteraction, MessageEmbed } from "discord.js";
import { setTimeout } from "timers/promises"
import dotenv from "dotenv"
import { generateDeck, Player, shuffle } from "./games/Blackjack";

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

    console.log("player:",player.getCards());
    console.log("player-points:",player.getPoints());
    console.log("dealer:",dealer.getCards());
    console.log("dealer-points:",dealer.getPoints());

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
        
        console.log("player:",player.getCards());
        console.log("player-points:",player.getPoints());
        
        await playerTurn(player, dealer, 10, i, row, collector);
      }else{
        while(dealer.getPoints() <= player.getPoints() || dealer.getPoints() < 21){
          dealer.hit(deck);

          console.log("dealer:",dealer.getCards());
          console.log("dealer-points:",dealer.getPoints());
        }
        await checkResults(player, dealer, 10, i, row);
        collector.stop();
      }
    })

    collector?.on('end', async c =>{
      await setTimeout(1000);
      await interaction.deleteReply();
    });
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
  console.log('Bot is on!');
});

client.login(process.env.DISCORD_API_TOKEN);
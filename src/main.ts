import { Client, Intents, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import dotenv from "dotenv"
import { generateDeck, Player, shuffle } from "./games/Blackjack";

dotenv.config();

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

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

    const embed = new MessageEmbed().setColor("DARK_GREEN").setTitle("BLACKJACK")
    .addField("Player Hand: ",player.getCards()?.toString()+"\nValor: "+player.getPoints(), true)
    .addField("\u200B","\u200B", true)
    .addField("Dealer Hand: ",dealer.getCards()?.toString()+"\nValor: "+dealer.getPoints(), true);

    interaction.reply({ embeds: [embed], components: [row] })

    const collector = interaction.channel?.createMessageComponentCollector(
      { 
        filter: i => i.customId === 'hit' || i.customId === 'stay',
        time: 20000,
        max: 1
      });

    collector?.on('collect', i =>{
      if (i.user.id === interaction.user.id){
        if(i.customId === "hit") i.reply("Hit");
        if(i.customId === "stay") i.update({ embeds: [embed], components: [] });
      }
    });
  }
})

client.once('ready', () =>{
  console.log('Bot is on!');
});

client.login(process.env.DISCORD_API_TOKEN);
export class Player {
  constructor(cards: Array<string | undefined>) {
    this.cards = cards;
  }
  
  private cards: Array<string | undefined> = [];
  
  public getCards(){
    return this.cards;
  }

  public hit(deck: string[]){
    const drawCard = deck.pop()
    if(drawCard !== undefined) this.cards?.push(drawCard);

    return this.getPoints();
  }

  public getPoints(){
    let temp = 0;
    if(this.cards){
      if(this.cards[0]?.startsWith('A') && this.cards[1]?.startsWith('A')) return 21;
  
      for(const card of this.cards){
        if(card) temp += this.pointChecker(card);
      }
      
      if(temp > 21){
        let haveAce = (this.cards?.filter(card => card?.startsWith("A"))).length > 0;
        if (haveAce) temp -= 10;
      }
  
    }
    return temp;
  }

  public pointChecker(card: string){
    if(card.length > 2 || card.startsWith("K") || card.startsWith("Q") || card.startsWith("J")) return 10;
    if(card.startsWith("A")) return 11;
    else return Number(card[0]);
  }
}

export async function generateDeck(){
  const ranks = await getRanks();
  const suits = ['S', 'C', 'D', 'H']

  const deck = [];

  for(const rank of ranks){
    for(const suit of suits){
      deck.push(rank+suit);
    }
  }

  return deck;
}

export async function getRanks(){
  return Array.from(Array(11).keys()).filter(n => n > 1).map(n => String(n)).concat(['J', 'Q', 'K', 'A']);;
}

export async function shuffle(deck: string[]){
  return deck.map(value => ({ value, sort: Math.random() }))
  .sort((a,b) => a.sort - b.sort)
  .map(({ value }) => value)
}
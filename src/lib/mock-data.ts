import { Token } from "./types";
import { calculatePrice, calculateMarketCap, calculateBondingCurveProgress } from "./bonding-curve";

const TOKEN_IMAGES = [
  "https://api.dicebear.com/7.x/identicon/svg?seed=doge",
  "https://api.dicebear.com/7.x/identicon/svg?seed=pepe",
  "https://api.dicebear.com/7.x/identicon/svg?seed=shib",
  "https://api.dicebear.com/7.x/identicon/svg?seed=bonk",
  "https://api.dicebear.com/7.x/identicon/svg?seed=wif",
  "https://api.dicebear.com/7.x/identicon/svg?seed=popcat",
  "https://api.dicebear.com/7.x/identicon/svg?seed=mog",
  "https://api.dicebear.com/7.x/identicon/svg?seed=brett",
  "https://api.dicebear.com/7.x/identicon/svg?seed=cat",
  "https://api.dicebear.com/7.x/identicon/svg?seed=moon",
  "https://api.dicebear.com/7.x/identicon/svg?seed=rocket",
  "https://api.dicebear.com/7.x/identicon/svg?seed=diamond",
];

function randomAddress(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";
  let result = "";
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generatePriceHistory(soldSupply: number, createdAt: number) {
  const points = [];
  const steps = 20;
  const supplyPerStep = soldSupply / steps;
  const timePerStep = (Date.now() - createdAt) / steps;

  for (let i = 0; i <= steps; i++) {
    const supply = supplyPerStep * i;
    points.push({
      timestamp: createdAt + timePerStep * i,
      price: calculatePrice(supply),
      volume: Math.random() * 5,
    });
  }
  return points;
}

function generateTrades(soldSupply: number) {
  const trades = [];
  const numTrades = Math.floor(Math.random() * 15) + 5;
  for (let i = 0; i < numTrades; i++) {
    const isBuy = Math.random() > 0.3;
    const solAmount = Math.random() * 10 + 0.1;
    trades.push({
      id: generateId(),
      type: isBuy ? "buy" as const : "sell" as const,
      trader: randomAddress(),
      amountSol: solAmount,
      amountToken: solAmount / calculatePrice(soldSupply * Math.random()),
      pricePerToken: calculatePrice(soldSupply * Math.random()),
      timestamp: Date.now() - Math.floor(Math.random() * 86400000),
    });
  }
  return trades.sort((a, b) => b.timestamp - a.timestamp);
}

function generateComments() {
  const commentTexts = [
    "LFG! 🚀🚀🚀",
    "This is going to the moon!",
    "Just aped in hard",
    "Dev based, community strong",
    "Who else is holding?",
    "This chart looks beautiful",
    "Don't sell, we're early",
    "100x from here easy",
    "Best community ever",
    "Bought the dip 💪",
    "This is the one",
    "Still early, NFA",
  ];

  const numComments = Math.floor(Math.random() * 6) + 2;
  const comments = [];
  for (let i = 0; i < numComments; i++) {
    comments.push({
      id: generateId(),
      author: randomAddress(),
      content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
      timestamp: Date.now() - Math.floor(Math.random() * 86400000),
    });
  }
  return comments.sort((a, b) => b.timestamp - a.timestamp);
}

const tokenDefs = [
  { name: "DogWifHat", ticker: "WIF", description: "The original dog with a hat. A Solana classic meme coin that took the crypto world by storm.", soldSupply: 350_000_000 },
  { name: "Pepe Solana", ticker: "PEPE", description: "The rarest Pepe on Solana. Feel the green. Be the green.", soldSupply: 250_000_000 },
  { name: "BonkInu", ticker: "BONK", description: "The people's dog coin. Bonk bonk bonk!", soldSupply: 500_000_000 },
  { name: "CatCoin", ticker: "CAT", description: "Cats > Dogs. The ultimate feline token on Solana.", soldSupply: 150_000_000 },
  { name: "MoonShot", ticker: "MOON", description: "Destination: Moon. Fuel: Diamond hands. Vehicle: Solana.", soldSupply: 100_000_000 },
  { name: "RocketFi", ticker: "ROCKET", description: "Defying gravity, one block at a time. Built different.", soldSupply: 420_000_000 },
  { name: "DiamondHands", ticker: "DIAMOND", description: "For those who never sell. True diamond hands only.", soldSupply: 200_000_000 },
  { name: "PopCat Sol", ticker: "POPCAT", description: "Pop pop pop! The most popular cat meme, now on Solana.", soldSupply: 300_000_000 },
  { name: "Brett Token", ticker: "BRETT", description: "Brett is blue. Brett is based. Brett is on Solana now.", soldSupply: 180_000_000 },
  { name: "Mog Coin", ticker: "MOG", description: "Mogging the competition since day one. Ultra chad token.", soldSupply: 280_000_000 },
  { name: "ShibaSol", ticker: "SHIB", description: "The Shiba Inu of Solana. Much wow, very fast, such low fees.", soldSupply: 600_000_000 },
  { name: "GigaChad", ticker: "GIGA", description: "The ultimate chad token. Only gigachads hold this one.", soldSupply: 75_000_000 },
];

export const MOCK_TOKENS: Token[] = tokenDefs.map((def, index) => {
  const createdAt = Date.now() - Math.floor(Math.random() * 7 * 86400000);
  const creator = randomAddress();
  return {
    id: generateId(),
    name: def.name,
    ticker: def.ticker,
    description: def.description,
    image: TOKEN_IMAGES[index % TOKEN_IMAGES.length],
    creatorAddress: creator,
    createdAt,
    marketCap: calculateMarketCap(def.soldSupply),
    virtualLiquidity: 30 + def.soldSupply * calculatePrice(def.soldSupply),
    totalSupply: 1_000_000_000,
    availableSupply: 800_000_000 - def.soldSupply,
    soldSupply: def.soldSupply,
    priceInSol: calculatePrice(def.soldSupply),
    bondingCurveProgress: calculateBondingCurveProgress(def.soldSupply),
    graduated: calculateBondingCurveProgress(def.soldSupply) >= 100,
    website: Math.random() > 0.5 ? "https://example.com" : undefined,
    twitter: Math.random() > 0.3 ? "https://twitter.com/example" : undefined,
    telegram: Math.random() > 0.5 ? "https://t.me/example" : undefined,
    comments: generateComments(),
    trades: generateTrades(def.soldSupply),
    priceHistory: generatePriceHistory(def.soldSupply, createdAt),
  };
});

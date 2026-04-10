import { Token } from "./types";
import { calculatePrice, calculateMarketCap, calculateBondingCurveProgress } from "./bonding-curve";

const POIN_IMAGES = [
  "https://api.dicebear.com/7.x/identicon/svg?seed=gaming",
  "https://api.dicebear.com/7.x/identicon/svg?seed=music",
  "https://api.dicebear.com/7.x/identicon/svg?seed=cooking",
  "https://api.dicebear.com/7.x/identicon/svg?seed=fitness",
  "https://api.dicebear.com/7.x/identicon/svg?seed=tech",
  "https://api.dicebear.com/7.x/identicon/svg?seed=art",
  "https://api.dicebear.com/7.x/identicon/svg?seed=travel",
  "https://api.dicebear.com/7.x/identicon/svg?seed=comedy",
  "https://api.dicebear.com/7.x/identicon/svg?seed=education",
  "https://api.dicebear.com/7.x/identicon/svg?seed=sports",
  "https://api.dicebear.com/7.x/identicon/svg?seed=vlog",
  "https://api.dicebear.com/7.x/identicon/svg?seed=dj",
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
      amountUsd: solAmount,
      amountToken: solAmount / calculatePrice(soldSupply * Math.random()),
      pricePerToken: calculatePrice(soldSupply * Math.random()),
      creatorFee: isBuy ? solAmount * 0.05 : 0,
      appFee: solAmount * 0.015,
      timestamp: Date.now() - Math.floor(Math.random() * 86400000),
    });
  }
  return trades.sort((a, b) => b.timestamp - a.timestamp);
}

function generateComments() {
  const commentTexts = [
    "Stream quality is amazing!",
    "This creator is going viral!",
    "Just bought in, great content!",
    "Best live stream today",
    "Who else is watching?",
    "The viewer count is insane!",
    "Don't sell, stream is growing",
    "100x viewers from here easy",
    "Best community ever",
    "Bought more during the stream",
    "This creator is the one",
    "Stream performance is fire!",
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

const poinDefs = [
  { name: "GamerPro Live", ticker: "GAMER", description: "Top gaming streamer with 24/7 live gameplay. Watch epic battles and esports tournaments live!", soldSupply: 350_000_000, youtubeUrl: "https://www.youtube.com/embed/jfKfPfyJRdk" },
  { name: "DJ BeatDrop", ticker: "BEATS", description: "Non-stop live DJ sets and music mixing. The hottest beats streaming 24/7.", soldSupply: 250_000_000, youtubeUrl: "https://www.youtube.com/embed/jfKfPfyJRdk" },
  { name: "Chef Kitchen", ticker: "CHEF", description: "Live cooking shows from around the world. Watch professional chefs create amazing dishes!", soldSupply: 500_000_000, youtubeUrl: "https://www.youtube.com/embed/jfKfPfyJRdk" },
  { name: "FitStream", ticker: "FIT", description: "Live fitness and workout streams. Join thousands of viewers getting fit together!", soldSupply: 150_000_000, youtubeUrl: "https://www.youtube.com/embed/jfKfPfyJRdk" },
  { name: "TechTalk Live", ticker: "TECH", description: "Live tech reviews, coding sessions, and gadget unboxings. The future is being streamed!", soldSupply: 100_000_000, youtubeUrl: "https://www.youtube.com/embed/jfKfPfyJRdk" },
  { name: "ArtStream", ticker: "ART", description: "Watch artists create masterpieces live. Digital art, painting, and creative sessions.", soldSupply: 420_000_000, youtubeUrl: "https://www.youtube.com/embed/jfKfPfyJRdk" },
  { name: "TravelVlog Live", ticker: "TRAVEL", description: "Live streams from exotic locations around the world. Explore without leaving home!", soldSupply: 200_000_000, youtubeUrl: "https://www.youtube.com/embed/jfKfPfyJRdk" },
  { name: "Comedy Central", ticker: "LOL", description: "Non-stop comedy and entertainment streams. Laugh out loud with the best comedians!", soldSupply: 300_000_000, youtubeUrl: "https://www.youtube.com/embed/jfKfPfyJRdk" },
  { name: "EduStream", ticker: "EDU", description: "Live educational content, tutorials, and lectures. Learn something new every day!", soldSupply: 180_000_000, youtubeUrl: "https://www.youtube.com/embed/jfKfPfyJRdk" },
  { name: "SportsCast", ticker: "SPORT", description: "Live sports commentary and analysis. Never miss a game with real-time coverage!", soldSupply: 280_000_000, youtubeUrl: "https://www.youtube.com/embed/jfKfPfyJRdk" },
  { name: "DailyVlog", ticker: "VLOG", description: "Daily life streams from popular vloggers. Real life, real time, real content!", soldSupply: 600_000_000, youtubeUrl: "https://www.youtube.com/embed/jfKfPfyJRdk" },
  { name: "MusicJam", ticker: "JAM", description: "Live jam sessions and music performances. From bedroom producers to stadium acts!", soldSupply: 75_000_000, youtubeUrl: "https://www.youtube.com/embed/jfKfPfyJRdk" },
];

export const MOCK_TOKENS: Token[] = poinDefs.map((def, index) => {
  const createdAt = Date.now() - Math.floor(Math.random() * 7 * 86400000);
  const creator = randomAddress();
  return {
    id: generateId(),
    name: def.name,
    ticker: def.ticker,
    description: def.description,
    image: POIN_IMAGES[index % POIN_IMAGES.length],
    creatorAddress: creator,
    createdAt,
    marketCap: calculateMarketCap(def.soldSupply),
    virtualLiquidity: 30 + def.soldSupply * calculatePrice(def.soldSupply),
    totalSupply: 1_000_000_000,
    availableSupply: 800_000_000 - def.soldSupply,
    soldSupply: def.soldSupply,
    priceInUsd: calculatePrice(def.soldSupply),
    bondingCurveProgress: calculateBondingCurveProgress(def.soldSupply),
    youtubeUrl: def.youtubeUrl,
    website: Math.random() > 0.5 ? "https://example.com" : undefined,
    twitter: Math.random() > 0.3 ? "https://twitter.com/example" : undefined,
    telegram: Math.random() > 0.5 ? "https://t.me/example" : undefined,
    comments: generateComments(),
    trades: generateTrades(def.soldSupply),
    priceHistory: generatePriceHistory(def.soldSupply, createdAt),
  };
});

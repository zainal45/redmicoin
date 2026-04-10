export interface Token {
  id: string;
  name: string;
  ticker: string;
  description: string;
  image: string;
  creatorAddress: string;
  createdAt: number;
  marketCap: number;
  virtualLiquidity: number;
  totalSupply: number;
  availableSupply: number;
  soldSupply: number;
  priceInSol: number;
  bondingCurveProgress: number; // 0-100
  graduated: boolean;
  website?: string;
  twitter?: string;
  telegram?: string;
  comments: Comment[];
  trades: Trade[];
  priceHistory: PricePoint[];
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: number;
}

export interface Trade {
  id: string;
  type: "buy" | "sell";
  trader: string;
  amountSol: number;
  amountToken: number;
  pricePerToken: number;
  timestamp: number;
}

export interface PricePoint {
  timestamp: number;
  price: number;
  volume: number;
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: number;
  tokenBalances: Record<string, number>;
}

import type {
  Staff,
  Shift,
  Credential,
  PredictionMarket,
  Dispute,
  ShiftStatus,
} from "@aegis-shift/shared";

export type {
  Staff,
  Shift,
  Credential,
  PredictionMarket,
  Dispute,
  ShiftStatus,
};

export type Stats = {
  totalStaff: number;
  activeShifts: number;
  totalCredentials: number;
  activeMarkets: number;
  totalTrades: number;
  totalDisputes: number;
  resolvedDisputes: number;
};

export type DashboardData = {
  stats: Stats;
  recentShifts: Shift[];
  recentTrades: { id: string; marketId: number; traderAddress: string; isYes: boolean; collateralAmount: string; timestamp: string; market?: { question: string } }[];
  pendingDisputes: Dispute[];
};

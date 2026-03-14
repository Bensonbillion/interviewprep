import "server-only";
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Credit pack definitions — single source of truth
export const CREDIT_PACKS = {
  starter: {
    name: "Starter Pack",
    credits: 8,
    price: 1600, // cents
    priceDisplay: "$16",
    description: "8 credits — 1 full kit + 3 single answers",
  },
  standard: {
    name: "Standard Pack",
    credits: 15,
    price: 3000,
    priceDisplay: "$30",
    description: "15 credits — 3 full kits",
    popular: true,
  },
  pro: {
    name: "Pro Pack",
    credits: 25,
    price: 5000,
    priceDisplay: "$50",
    description: "25 credits — 5 full kits",
  },
} as const;

export type PackId = keyof typeof CREDIT_PACKS;

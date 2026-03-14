// Shared Stripe constants — safe for client and server import

export const CREDIT_PACKS = {
  starter: {
    name: "Starter Pack",
    credits: 8,
    price: 1600,
    priceDisplay: "$16",
    description: "8 credits — 1 full kit + 3 single answers",
  },
  standard: {
    name: "Standard Pack",
    credits: 15,
    price: 3000,
    priceDisplay: "$30",
    description: "15 credits — 3 full kits",
    popular: true as const,
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

export const CREDIT_COSTS = {
  full_kit: 5,
  single_answer: 1,
  refinement: 1,
} as const;

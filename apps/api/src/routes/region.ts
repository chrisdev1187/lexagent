import { Hono } from "hono";

const REGION_MAP: Record<string, { region: string; currency: string; symbol: string; locale: string }> = {
  ZA: { region: "ZA", currency: "ZAR", symbol: "R",  locale: "en-ZA" },
  GB: { region: "GB", currency: "GBP", symbol: "£",  locale: "en-GB" },
  US: { region: "US", currency: "USD", symbol: "$",  locale: "en-US" },
  CA: { region: "CA", currency: "USD", symbol: "$",  locale: "en-US" },
  AU: { region: "AU", currency: "USD", symbol: "$",  locale: "en-US" },
};

const DEFAULT = { region: "US", currency: "USD", symbol: "$", locale: "en-US" };

export const regionRouter = new Hono();

regionRouter.get("/", (c) => {
  const country = c.req.header("x-vercel-ip-country") ?? "";
  const info = REGION_MAP[country.toUpperCase()] ?? DEFAULT;
  return c.json(info);
});

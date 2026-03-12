import { Product, ProductNiche } from "../types/product";

export const VALID_NICHES: ProductNiche[] = ["Tech", "Fitness", "Crypto", "Web3", "Home"];

export function getProductsByNiche(products: Product[], niche?: ProductNiche): Product[] {
  if (!niche) return products;
  return products.filter((product) => product.niche === niche);
}

export function pickRandomProduct(products: Product[]): Product {
  const index = Math.floor(Math.random() * products.length);
  return products[index];
}

export function resolveNicheFromEnv(): ProductNiche | undefined {
  const value = process.env.PRODUCT_NICHE;
  if (!value) return undefined;

  if (VALID_NICHES.includes(value as ProductNiche)) {
    return value as ProductNiche;
  }

  throw new Error(
    `Invalid PRODUCT_NICHE="${value}". Allowed: ${VALID_NICHES.join(" | ")}`
  );
}

/** Returns a summary of how many products exist per niche */
export function getNicheSummary(products: Product[]): Record<string, number> {
  return products.reduce<Record<string, number>>((acc, p) => {
    acc[p.niche] = (acc[p.niche] ?? 0) + 1;
    return acc;
  }, {});
}

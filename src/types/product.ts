export type ProductNiche = "Tech" | "Fitness" | "Crypto" | "Web3" | "Home";

export type ProductProvider = "Amazon" | "ManualSeed" | "Web3Jobs" | "API";

export interface ProductSource {
  provider: ProductProvider | string;
  feedType: "manual" | "api" | "csv" | "amazon";
  externalId?: string;
}

export interface Product {
  id: string;
  niche: ProductNiche;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  affiliateUrl: string;
  /** Optional Amazon ASIN for building canonical affiliate URLs */
  asin?: string;
  imageUrl?: string;
  tags: string[];
  source: ProductSource;
}

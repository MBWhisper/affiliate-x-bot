import { Product } from "../types/product";

const localProducts = require("../data/products.json") as Product[];

type ApiProductResponse = Product[] | { products?: Product[] };

function isProductArray(value: unknown): value is Product[] {
  return Array.isArray(value);
}

function extractProducts(payload: ApiProductResponse): Product[] {
  if (isProductArray(payload)) return payload;
  if (payload && Array.isArray(payload.products)) return payload.products;
  return [];
}

export async function loadProducts(): Promise<Product[]> {
  const sourceUrl = process.env.PRODUCT_SOURCE_URL;

  if (!sourceUrl) {
    return localProducts;
  }

  const headers: Record<string, string> = {
    Accept: "application/json"
  };

  if (process.env.PRODUCT_SOURCE_API_KEY) {
    headers.Authorization = `Bearer ${process.env.PRODUCT_SOURCE_API_KEY}`;
  }

  const response = await fetch(sourceUrl, { headers });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch products from PRODUCT_SOURCE_URL. Status: ${response.status}`
    );
  }

  const payload = (await response.json()) as ApiProductResponse;
  const products = extractProducts(payload);

  if (products.length === 0) {
    throw new Error("Remote product source returned empty/invalid products payload");
  }

  return products;
}

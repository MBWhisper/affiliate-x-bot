import { Product, ProductNiche } from '../../types/product';
import {
  getProductsByNiche,
  pickRandomProduct,
  resolveNicheFromEnv,
  getNicheSummary,
  VALID_NICHES,
} from '../productCatalog';

describe('productCatalog', () => {
  const mockProducts: Product[] = [
    {
      id: 'test-1',
      niche: 'Tech',
      title: 'Test Tech Product',
      description: 'A test tech product',
      price: 99.99,
      currency: 'USD',
      affiliateUrl: 'https://example.com/tech',
      tags: ['tech', 'gadget'],
      source: { provider: 'ManualSeed', feedType: 'manual' },
    },
    {
      id: 'test-2',
      niche: 'Tech',
      title: 'Another Tech Product',
      description: 'Another test tech product',
      price: 149.99,
      originalPrice: 199.99,
      currency: 'USD',
      affiliateUrl: 'https://example.com/tech2',
      tags: ['tech', 'smart'],
      source: { provider: 'ManualSeed', feedType: 'manual' },
    },
    {
      id: 'test-3',
      niche: 'Fitness',
      title: 'Test Fitness Product',
      description: 'A test fitness product',
      price: 49.99,
      currency: 'USD',
      affiliateUrl: 'https://example.com/fitness',
      tags: ['fitness', 'workout'],
      source: { provider: 'ManualSeed', feedType: 'manual' },
    },
    {
      id: 'test-4',
      niche: 'Crypto',
      title: 'Test Crypto Product',
      description: 'A test crypto product',
      price: 199.99,
      currency: 'USD',
      affiliateUrl: 'https://example.com/crypto',
      tags: ['crypto', 'hardware'],
      source: { provider: 'ManualSeed', feedType: 'manual' },
    },
  ];

  describe('getProductsByNiche', () => {
    it('should return all products when niche is undefined', () => {
      const result = getProductsByNiche(mockProducts, undefined);
      expect(result).toHaveLength(4);
    });

    it('should return only Tech products when niche is Tech', () => {
      const result = getProductsByNiche(mockProducts, 'Tech');
      expect(result).toHaveLength(2);
      expect(result.every(p => p.niche === 'Tech')).toBe(true);
    });

    it('should return only Fitness products when niche is Fitness', () => {
      const result = getProductsByNiche(mockProducts, 'Fitness');
      expect(result).toHaveLength(1);
      expect(result[0].niche).toBe('Fitness');
    });

    it('should return empty array for non-existent niche', () => {
      const result = getProductsByNiche(mockProducts, 'Home' as ProductNiche);
      expect(result).toHaveLength(0);
    });
  });

  describe('pickRandomProduct', () => {
    it('should return a product from the array', () => {
      const result = pickRandomProduct(mockProducts);
      expect(mockProducts).toContain(result);
    });

    it('should handle single item array', () => {
      const singleProduct = [mockProducts[0]];
      const result = pickRandomProduct(singleProduct);
      expect(result).toBe(mockProducts[0]);
    });

    it('should throw error for empty array', () => {
      expect(() => pickRandomProduct([])).toThrow();
    });
  });

  describe('VALID_NICHES', () => {
    it('should contain all valid niches', () => {
      expect(VALID_NICHES).toContain('Tech');
      expect(VALID_NICHES).toContain('Fitness');
      expect(VALID_NICHES).toContain('Crypto');
      expect(VALID_NICHES).toContain('Web3');
      expect(VALID_NICHES).toContain('Home');
      expect(VALID_NICHES).toHaveLength(5);
    });
  });

  describe('getNicheSummary', () => {
    it('should return correct counts per niche', () => {
      const result = getNicheSummary(mockProducts);
      expect(result['Tech']).toBe(2);
      expect(result['Fitness']).toBe(1);
      expect(result['Crypto']).toBe(1);
      expect(result['Web3']).toBeUndefined();
      expect(result['Home']).toBeUndefined();
    });

    it('should return empty object for empty array', () => {
      const result = getNicheSummary([]);
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('resolveNicheFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return undefined when PRODUCT_NICHE is not set', () => {
      delete process.env.PRODUCT_NICHE;
      const result = resolveNicheFromEnv();
      expect(result).toBeUndefined();
    });

    it('should return niche when valid PRODUCT_NICHE is set', () => {
      process.env.PRODUCT_NICHE = 'Tech';
      const result = resolveNicheFromEnv();
      expect(result).toBe('Tech');
    });

    it('should throw error for invalid niche', () => {
      process.env.PRODUCT_NICHE = 'InvalidNiche';
      expect(() => resolveNicheFromEnv()).toThrow(
        'Invalid PRODUCT_NICHE="InvalidNiche". Allowed: Tech | Fitness | Crypto | Web3 | Home'
      );
    });
  });
});

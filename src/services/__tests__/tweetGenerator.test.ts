import { Product, ProductNiche } from '../types/product';
import { generateDealTweet } from '../tweetGenerator';

describe('tweetGenerator', () => {
  const mockProduct: Product = {
    id: 'test-1',
    niche: 'Tech',
    title: 'Echo Dot (5th Gen)',
    description: 'Smart speaker with Alexa - Cloud Blue',
    price: 49.99,
    originalPrice: 99.99,
    currency: 'USD',
    affiliateUrl: 'https://www.amazon.com/dp/B09B8RF4PY/',
    asin: 'B09B8RF4PY',
    imageUrl: 'https://example.com/image.jpg',
    tags: ['SmartHome', 'Alexa', 'Speaker'],
    source: { provider: 'Amazon', feedType: 'amazon' },
  };

  const mockProductNoDiscount: Product = {
    id: 'test-2',
    niche: 'Fitness',
    title: 'Fitbit Charge 6',
    description: 'Advanced fitness tracker with Google apps',
    price: 159.99,
    currency: 'USD',
    affiliateUrl: 'https://example.com/fitbit',
    tags: ['Fitness', 'Tracker', 'Health'],
    source: { provider: 'Amazon', feedType: 'amazon' },
  };

  const mockProductNonAmazon: Product = {
    id: 'test-3',
    niche: 'Web3',
    title: 'Mastering Ethereum',
    description: 'The complete guide to building decentralized apps',
    price: 39.99,
    currency: 'USD',
    affiliateUrl: 'https://example.com/ethereum-book',
    tags: ['Book', 'Ethereum', 'Blockchain'],
    source: { provider: 'ManualSeed', feedType: 'manual' },
  };

  describe('generateDealTweet', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should generate a tweet with discount text for products with originalPrice', () => {
      process.env.AMAZON_ASSOCIATE_TAG = 'test-20';
      delete process.env.AFFILIATE_DISCLOSURE;

      const tweet = generateDealTweet(mockProduct);

      expect(tweet).toContain('Echo Dot (5th Gen)');
      expect(tweet).toContain('$49.99');
      expect(tweet).toContain('#ad');
      expect(tweet.length).toBeLessThanOrEqual(280);
    });

    it('should generate a tweet with price only for products without originalPrice', () => {
      process.env.AMAZON_ASSOCIATE_TAG = 'test-20';
      delete process.env.AFFILIATE_DISCLOSURE;

      const tweet = generateDealTweet(mockProductNoDiscount);

      expect(tweet).toContain('Fitbit Charge 6');
      expect(tweet).toContain('$159.99');
      expect(tweet).toContain('#ad');
      expect(tweet.length).toBeLessThanOrEqual(280);
    });

    it('should include Amazon affiliate tag in URL when set', () => {
      process.env.AMAZON_ASSOCIATE_TAG = 'test-20';

      const tweet = generateDealTweet(mockProduct);

      expect(tweet).toContain('tag=test-20');
    });

    it('should include UTM parameters for non-Amazon URLs', () => {
      process.env.AMAZON_ASSOCIATE_TAG = '';
      process.env.UTM_SOURCE = 'twitter';
      process.env.UTM_MEDIUM = 'social';
      process.env.UTM_CAMPAIGN = 'deals';

      const tweet = generateDealTweet(mockProductNonAmazon);

      expect(tweet).toContain('utm_source=twitter');
      expect(tweet).toContain('utm_medium=social');
      expect(tweet).toContain('utm_campaign=deals');
    });

    it('should use default UTM parameters when not set', () => {
      delete process.env.AMAZON_ASSOCIATE_TAG;
      delete process.env.UTM_SOURCE;
      delete process.env.UTM_MEDIUM;
      delete process.env.UTM_CAMPAIGN;

      const tweet = generateDealTweet(mockProductNonAmazon);

      expect(tweet).toContain('utm_source=x');
      expect(tweet).toContain('utm_medium=social');
    });

    it('should include niche-specific hashtags', () => {
      process.env.AMAZON_ASSOCIATE_TAG = 'test-20';

      const tweet = generateDealTweet(mockProduct);

      // Check for hashtags from product tags
      expect(tweet).toContain('#SmartHome');
      expect(tweet).toContain('#Alexa');
      expect(tweet).toContain('#Speaker');
    });

    it('should use custom affiliate disclosure when set', () => {
      process.env.AMAZON_ASSOCIATE_TAG = 'test-20';
      process.env.AFFILIATE_DISCLOSURE = '#sponsored';

      const tweet = generateDealTweet(mockProduct);

      expect(tweet).toContain('#sponsored');
      expect(tweet).not.toContain('#ad');
    });

    it('should truncate tweet if it exceeds 280 characters', () => {
      process.env.AMAZON_ASSOCIATE_TAG = 'test-20';

      // Create a product with very long description and many tags
      const longProduct: Product = {
        ...mockProduct,
        title: 'A Very Long Product Title That Might Cause Issues',
        description: 'This is a very long description that could potentially make the tweet exceed the 280 character limit when combined with all the other elements like hashtags, URLs, and discount information.',
        tags: ['Tag1', 'Tag2', 'Tag3', 'Tag4', 'Tag5', 'Tag6', 'Tag7', 'Tag8'],
      };

      const tweet = generateDealTweet(longProduct);

      expect(tweet.length).toBeLessThanOrEqual(280);
    });

    it('should contain at least one hook or template element', () => {
      process.env.AMAZON_ASSOCIATE_TAG = 'test-20';

      const tweet = generateDealTweet(mockProduct);

      // Should contain some common template elements
      const hasExpectedElement =
        tweet.includes('⚡') ||
        tweet.includes('Deal') ||
        tweet.includes('🔥') ||
        tweet.includes('✨');

      expect(hasExpectedElement).toBe(true);
    });

    it('should contain a call to action', () => {
      process.env.AMAZON_ASSOCIATE_TAG = 'test-20';

      const tweet = generateDealTweet(mockProduct);

      const hasCta =
        tweet.includes('Grab it') ||
        tweet.includes('Check') ||
        tweet.includes('See') ||
        tweet.includes('Shop') ||
        tweet.includes('Order');

      expect(hasCta).toBe(true);
    });
  });
});

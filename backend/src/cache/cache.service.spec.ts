import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';

describe('CacheService (no REDIS_URL)', () => {
  let service: CacheService;

  beforeEach(async () => {
    // Ensure no REDIS_URL — all ops become no-ops
    delete process.env.REDIS_URL;

    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheService],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('get() returns null when Redis is not configured', async () => {
    const result = await service.get('any-key');
    expect(result).toBeNull();
  });

  it('set() resolves without error when Redis is not configured', async () => {
    await expect(service.set('key', { data: 1 }, 60)).resolves.not.toThrow();
  });

  it('del() resolves without error when Redis is not configured', async () => {
    await expect(service.del('key1', 'key2')).resolves.not.toThrow();
  });

  it('delPattern() resolves without error when Redis is not configured', async () => {
    await expect(service.delPattern('report:*')).resolves.not.toThrow();
  });
});

/**
 * Redis-backed cache service with automatic no-op fallback.
 * When REDIS_URL is not set (dev / CI / test), all operations silently
 * succeed without connecting to Redis — zero configuration required.
 */

import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly client: Redis | null;
  private readonly logger = new Logger(CacheService.name);

  constructor() {
    const url = process.env.REDIS_URL;
    if (url) {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        lazyConnect: true,
        enableOfflineQueue: false,
      });
      this.client.on('error', (err: Error) => {
        // Log but don't crash — cache failures are non-fatal
        this.logger.warn(`Redis error (cache degraded): ${err.message}`);
      });
      this.client.connect().catch(() => {
        this.logger.warn('Redis unavailable — cache disabled, falling back to direct DB queries');
      });
    } else {
      this.client = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Non-fatal — caller falls back to direct DB
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.client || !keys.length) return;
    try {
      await this.client.del(...keys);
    } catch {
      // Non-fatal
    }
  }

  /** Invalidate all cache keys matching a glob pattern without Redis KEYS blocking. */
  async delPattern(pattern: string): Promise<void> {
    if (!this.client) return;
    try {
      const keys: string[] = [];
      let cursor = '0';
      do {
        const [nextCursor, batch] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        keys.push(...batch);
      } while (cursor !== '0');
      if (keys.length) await this.client.del(...keys);
    } catch {
      // Non-fatal
    }
  }

  onModuleDestroy(): void {
    this.client?.disconnect();
  }
}

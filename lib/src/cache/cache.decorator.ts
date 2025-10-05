import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';
export const CACHE_INVALIDATE_METADATA = 'cache:invalidate';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyPrefix?: string;
  invalidatePattern?: string; // Pattern to invalidate when this method is called
}

/**
 * Cache decorator for automatic caching of method results
 *
 * @param options Cache configuration options
 * @example
 * ```typescript
 * @Cacheable({ ttl: 300, keyPrefix: 'customer' })
 * async findById(id: string) {
 *   return this.repository.findById(id);
 * }
 * ```
 */
export function Cacheable(options: CacheOptions = {}) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const targetClass = target as { constructor: { name: string } };
    SetMetadata(CACHE_KEY_METADATA, {
      prefix: options.keyPrefix || targetClass.constructor.name.toLowerCase(),
      method: propertyName,
    })(target, propertyName, descriptor);

    const DEFAULT_TTL = 300;
    SetMetadata(CACHE_TTL_METADATA, options.ttl || DEFAULT_TTL)(target, propertyName, descriptor);

    if (options.invalidatePattern) {
      SetMetadata(CACHE_INVALIDATE_METADATA, options.invalidatePattern)(
        target,
        propertyName,
        descriptor,
      );
    }
  };
}

/**
 * Cache invalidation decorator
 *
 * @param patterns Cache key patterns to invalidate
 * @example
 * ```typescript
 * @CacheInvalidate(['customer:*', 'order:*'])
 * async updateCustomer(id: string, data: any) {
 *   return this.repository.update(id, data);
 * }
 * ```
 */
export function CacheInvalidate(patterns: string[]) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    SetMetadata(CACHE_INVALIDATE_METADATA, patterns)(target, propertyName, descriptor);
  };
}

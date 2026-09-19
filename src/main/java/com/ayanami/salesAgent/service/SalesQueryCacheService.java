package com.ayanami.salesAgent.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;

/** 手写的缓存读写封装，当前无调用方 */
@Service
public class SalesQueryCacheService {

    private final SalesQueryService queryService;
    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${sales-agent.cache.query-ttl-seconds:300}")//从配置文件读缓存过期秒数，默认300秒
    private long cacheTtlSeconds;

    public SalesQueryCacheService(SalesQueryService queryService,
                                  RedisTemplate<String, Object> redisTemplate) {
        this.queryService = queryService;
        this.redisTemplate = redisTemplate;
    }

    public BigDecimal queryTotalAmountCached(Long regionId, LocalDate start, LocalDate end) {
        String cacheKey = String.format("total_amount:%s:%s:%s",
                regionId != null ? regionId : "all", start, end);

        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return new BigDecimal(cached.toString());
        }

        BigDecimal result = queryService.queryTotalAmount(regionId, start, end);
        redisTemplate.opsForValue().set(cacheKey, result.toPlainString(),
                Duration.ofSeconds(cacheTtlSeconds));
        return result;
    }
}

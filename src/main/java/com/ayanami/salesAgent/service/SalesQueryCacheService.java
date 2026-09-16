package com.ayanami.salesAgent.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;

@Service
public class SalesQueryCacheService {

    private final SalesQueryService queryService;
    private final RedisTemplate<String, Object> redisTemplate;

    // 缓存命中 / 未命中计数器，两者比值即命中率
    private final Counter hitCounter;
    private final Counter missCounter;

    @Value("${sales-agent.cache.query-ttl-seconds:300}")//从配置文件读缓存过期秒数，默认300秒
    private long cacheTtlSeconds;

    public SalesQueryCacheService(SalesQueryService queryService,
                                  RedisTemplate<String, Object> redisTemplate,
                                  MeterRegistry meterRegistry) {
        this.queryService = queryService;
        this.redisTemplate = redisTemplate;
        // tag 区分命中结果，/actuator/metrics/cache.query.requests 可分别查看
        this.hitCounter = Counter.builder("cache.query.requests")
                .description("Cache lookup results")
                .tag("result", "hit")
                .register(meterRegistry);
        this.missCounter = Counter.builder("cache.query.requests")
                .description("Cache lookup results")
                .tag("result", "miss")
                .register(meterRegistry);
    }

    public BigDecimal queryTotalAmountCached(Long regionId, LocalDate start, LocalDate end) {
        String cacheKey = String.format("total_amount:%s:%s:%s",
                regionId != null ? regionId : "all", start, end);

        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            hitCounter.increment();//命中直接返回
            return new BigDecimal(cached.toString());
        }

        missCounter.increment();//未命中，回源数据库
        BigDecimal result = queryService.queryTotalAmount(regionId, start, end);
        redisTemplate.opsForValue().set(cacheKey, result.toPlainString(),
                Duration.ofSeconds(cacheTtlSeconds));
        return result;
    }
}

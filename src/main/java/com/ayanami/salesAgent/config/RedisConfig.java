package com.ayanami.salesAgent.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableCaching//开启Spring Cache注解功能，之后可以用注解自动存缓存，删缓存
public class RedisConfig {

    /**
     * 创建带类型信息的 ObjectMapper。
     * activateDefaultTyping 让 Jackson 在序列化时写入 @class 字段，
     * 反序列化时才能还原成正确的 Java 类型（而不是 LinkedHashMap）。
     */
    private ObjectMapper redisObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        // WRAPPER_ARRAY 将类型信息包在数组里：["com.example.Dto", {...}]
        // 比 AS_PROPERTY 对 List/集合类型更兼容
        mapper.activateDefaultTyping(
                LaissezFaireSubTypeValidator.instance,
                ObjectMapper.DefaultTyping.NON_FINAL,
                JsonTypeInfo.As.WRAPPER_ARRAY
        );
        return mapper;
    }
    //手动好操作Redis用的工具
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        // JSON 序列化器(让 Redis 里的数据不乱码、能看懂、能还原)
        GenericJackson2JsonRedisSerializer jsonSerializer =
                new GenericJackson2JsonRedisSerializer(redisObjectMapper());
        // 设置 key 用字符串序列化
        template.setKeySerializer(new StringRedisSerializer());
        // 设置 value 用 JSON 序列化
        template.setValueSerializer(jsonSerializer);
        // Hash 同上
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(jsonSerializer);
        return template;
    }
    //Spring自动缓存@Cacheable
    @Bean
    public CacheManager cacheManager(RedisConnectionFactory factory, MeterRegistry meterRegistry) {
        GenericJackson2JsonRedisSerializer jsonSerializer =
                new GenericJackson2JsonRedisSerializer(redisObjectMapper());
        //默认缓存配置：5分钟过期
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5))
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(jsonSerializer));

        // 不同缓存区设置不同 TTL
        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();
        cacheConfigs.put("rep-ranking",       defaultConfig.entryTtl(Duration.ofMinutes(5)));
        cacheConfigs.put("region-ranking",    defaultConfig.entryTtl(Duration.ofMinutes(5)));
        cacheConfigs.put("monthly-trend",     defaultConfig.entryTtl(Duration.ofMinutes(5)));
        cacheConfigs.put("product-ranking",   defaultConfig.entryTtl(Duration.ofMinutes(5)));
        cacheConfigs.put("region-meta",       defaultConfig.entryTtl(Duration.ofMinutes(30)));
        cacheConfigs.put("anomaly-detection", defaultConfig.entryTtl(Duration.ofMinutes(2)));

        RedisCacheManager redisCacheManager = RedisCacheManager.builder(factory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .build();

        // 包一层统计缓存命中率
        return new MetricsCacheManager(redisCacheManager, meterRegistry);
    }
}
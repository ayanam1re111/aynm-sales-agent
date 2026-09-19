package com.ayanami.salesAgent.config;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;

import java.util.Collection;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;

/** 缓存命中率统计，指标 cache.query.requests */
public class MetricsCacheManager implements CacheManager {

    private final CacheManager delegate;
    private final MeterRegistry meterRegistry;

    private final ConcurrentHashMap<String, Cache> wrapped = new ConcurrentHashMap<>();

    public MetricsCacheManager(CacheManager delegate, MeterRegistry meterRegistry) {
        this.delegate = delegate;
        this.meterRegistry = meterRegistry;
    }

    @Override
    public Cache getCache(String name) {
        Cache existing = wrapped.get(name);
        if (existing != null) {
            return existing;
        }
        Cache delegateCache = delegate.getCache(name);
        if (delegateCache == null) {
            return null;
        }
        return wrapped.computeIfAbsent(name, n -> new MetricsCache(delegateCache, meterRegistry));
    }

    @Override
    public Collection<String> getCacheNames() {
        return delegate.getCacheNames();
    }

    /** 只在读取路径计数 */
    private static final class MetricsCache implements Cache {

        private final Cache delegate;
        private final Counter hit;
        private final Counter miss;

        MetricsCache(Cache delegate, MeterRegistry meterRegistry) {
            this.delegate = delegate;
            this.hit = Counter.builder("cache.query.requests")
                    .description("Cache lookup results")
                    .tag("cache", delegate.getName())
                    .tag("result", "hit")
                    .register(meterRegistry);
            this.miss = Counter.builder("cache.query.requests")
                    .description("Cache lookup results")
                    .tag("cache", delegate.getName())
                    .tag("result", "miss")
                    .register(meterRegistry);
        }

        private void record(Object value) {
            if (value != null) hit.increment();
            else miss.increment();
        }

        @Override
        public ValueWrapper get(Object key) {
            ValueWrapper wrapper = delegate.get(key);
            record(wrapper);
            return wrapper;
        }

        @Override
        public <T> T get(Object key, Class<T> type) {
            T value = delegate.get(key, type);
            record(value);
            return value;
        }

        /** 同步加载路径，单独计数 */
        @Override
        public <T> T get(Object key, Callable<T> valueLoader) {
            ValueWrapper existing = delegate.get(key);
            if (existing != null) {
                hit.increment();
                @SuppressWarnings("unchecked")
                T value = (T) existing.get();
                return value;
            }
            miss.increment();
            return delegate.get(key, valueLoader);
        }

        @Override
        public void put(Object key, Object value) {
            delegate.put(key, value);
        }

        @Override
        public void evict(Object key) {
            delegate.evict(key);
        }

        @Override
        public void clear() {
            delegate.clear();
        }

        @Override
        public String getName() {
            return delegate.getName();
        }

        @Override
        public Object getNativeCache() {
            return delegate.getNativeCache();
        }
    }
}

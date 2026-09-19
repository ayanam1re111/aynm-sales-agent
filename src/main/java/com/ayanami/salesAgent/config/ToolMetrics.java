package com.ayanami.salesAgent.config;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/** 工具耗时统计，ThreadLocal 在两个回调间传递起始时间 */
@Component
@Slf4j
public class ToolMetrics {

    private final MeterRegistry meterRegistry;

    private final ConcurrentHashMap<String, Timer> timerCache = new ConcurrentHashMap<>();

    private final ThreadLocal<Long> startNanos = new ThreadLocal<>();

    public ToolMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    /** 工具执行前调用，记录起始时间 */
    public void start() {
        startNanos.set(System.nanoTime());
    }

    /** 工具执行后调用，累加调用次数并结算本次耗时 */
    public void finish(String toolName) {
        meterRegistry.counter("agent.tool.calls", "tool", toolName).increment();

        Long begin = startNanos.get();
        if (begin == null) {
            return;
        }
        startNanos.remove();// 清理，防止线程池复用串号

        long costNanos = System.nanoTime() - begin;
        timerCache.computeIfAbsent(toolName, name -> Timer.builder("agent.tool.duration")
                        .description("Tool execution latency")
                        .tag("tool", name)
                        .publishPercentiles(0.5, 0.95, 0.99)
                        .register(meterRegistry))
                .record(costNanos, TimeUnit.NANOSECONDS);

        log.info("工具耗时 | 工具：{} | 耗时：{} ms", toolName, costNanos / 1_000_000);
    }
}

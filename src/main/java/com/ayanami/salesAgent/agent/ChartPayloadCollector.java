package com.ayanami.salesAgent.agent;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 图表载荷收集器：图表工具把 ECharts option 存进这里，模型只输出 [[CHART]] 占位符，
 * Controller 取走后按独立的 chart 事件下发给前端，图表数据不经过模型转述。
 * 工具执行线程写、Controller 线程读，故用并发容器 + 同步 List 保证顺序。
 */
@Component
public class ChartPayloadCollector {

    private final ConcurrentHashMap<String, List<String>> bySessionId = new ConcurrentHashMap<>();

    /** 工具线程调用：把本次生成的图表 JSON 追加到该会话的队列尾部 */
    public void add(String sessionId, String optionJson) {
        if (sessionId == null || optionJson == null || optionJson.isBlank()) return;
        bySessionId
                .computeIfAbsent(sessionId, k -> Collections.synchronizedList(new ArrayList<>()))
                .add(optionJson);
    }

    /**
     * 取走该会话当前已生成的图表。取走即清空 —— 同一个会话里一个回合可能连续调用
     * 多个图表工具，每次 onToolExecuted 取走自己那一批，顺序天然与调用顺序一致。
     */
    public List<String> drain(String sessionId) {
        if (sessionId == null) return List.of();
        List<String> payloads = bySessionId.remove(sessionId);
        return payloads == null ? List.of() : List.copyOf(payloads);
    }

    /** 异常中断时清掉残留，否则这份 JSON 会一直挂在这个 sessionId 上 */
    public void clear(String sessionId) {
        if (sessionId != null) bySessionId.remove(sessionId);
    }
}

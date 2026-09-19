package com.ayanami.salesAgent.agent;

import com.ayanami.salesAgent.config.PromptCompressor;
import com.ayanami.salesAgent.config.ToolMetrics;
import com.ayanami.salesAgent.memory.MysqlChatMemoryStore;
import com.ayanami.salesAgent.tool.*;
import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.StreamingChatModel;
import dev.langchain4j.service.AiServices;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.function.Function;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class SalesAgentConfig {

    private final ChatModel chatLanguageModel;
    private final StreamingChatModel streamingChatModel;//注入流式输出
    private final SalesQueryTool salesQueryTool;
    private final SalesSummaryTool salesSummaryTool;
    private final SalesTrendTool salesTrendTool;
    private final ChartGeneratorTool chartGeneratorTool;
    private final AnomalyDetectionTool anomalyDetectionTool;
    private final MysqlChatMemoryStore chatMemoryStore;   // 注入持久化存储
    private final ToolMetrics toolMetrics;                // 工具耗时指标
    private final PromptCompressor promptCompressor;      // 上下文压缩

    /** 单次请求的连续工具调用上限 */
    @Value("${sales-agent.tool.max-sequential-invocations:8}")
    private int maxSequentialInvocations;

    @Bean
    public SalesAgent salesAgent() {
        return AiServices.builder(SalesAgent.class)
                .chatModel(chatLanguageModel)
                .streamingChatModel(streamingChatModel)
                .chatRequestTransformer(promptCompressor::compress)
                // 身份还原不在这里做：systemMessageTransformer 实测跑在 Servlet 线程上，
                // 写进去的 ThreadLocal 工具线程照样读不到。由各 @Tool 方法在
                // 自己的执行线程上调用 UserSessionRegistry.bindToCurrentThread() 完成。
                .tools(salesQueryTool,
                       salesSummaryTool,
                       salesTrendTool,
                       chartGeneratorTool,
                       anomalyDetectionTool)
                .maxSequentialToolsInvocations(maxSequentialInvocations)
                .beforeToolExecution(exec -> {
                    toolMetrics.start();
                    log.info("▶ 工具调用开始 | 工具：{} | 参数：{}",
                            exec.request().name(),
                            exec.request().arguments());
                })
                .afterToolExecution(exec -> {
                    log.info("◀ 工具调用完成 | 工具：{} | 结果长度：{} 字符",
                            exec.request().name(),
                            exec.result() != null ? exec.result().length() : 0);
                    toolMetrics.finish(exec.request().name());
                })
                .chatMemoryProvider(memoryId ->
                        MessageWindowChatMemory.builder()
                                .id(memoryId)
                                .maxMessages(20)
                                .chatMemoryStore(chatMemoryStore)
                                .build())
                .build();

    }
}
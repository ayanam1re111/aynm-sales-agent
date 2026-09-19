package com.ayanami.salesAgent.config;

import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.ToolExecutionResultMessage;
import dev.langchain4j.model.chat.request.ChatRequest;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/** 上下文压缩：调用模型前裁掉过长的工具返回 */
@Component
@Slf4j
public class PromptCompressor {

    private static final String CHART_PREFIX = "CHART_JSON:";

    /** 截断标记，中英各一份 */
    private static final String ELLIPSIS_TEMPLATE =
            "\n……（此处省略 %d 字符，结果过长已截断，请勿据此推断整体情况）……\n"
                    + "\n...[%d characters omitted; the tool result was truncated]\n";

    private final Counter compressedCharsCounter;
    private final Counter compressedMessagesCounter;

    @Value("${sales-agent.prompt.tool-result-max-chars:1200}")
    private int maxToolResultChars;

    public PromptCompressor(MeterRegistry meterRegistry) {
        this.compressedCharsCounter = Counter.builder("llm.prompt.compressed.chars")
                .description("Characters removed from the prompt by compression")
                .register(meterRegistry);
        this.compressedMessagesCounter = Counter.builder("llm.prompt.compressed.messages")
                .description("Tool results shortened by compression")
                .register(meterRegistry);
    }

    /** 返回压缩后的正文，无需压缩则返回 null */
    public ChatRequest compress(ChatRequest request) {
        List<ChatMessage> messages = request.messages();
        List<ChatMessage> compressed = new ArrayList<>(messages.size());
        boolean changed = false;

        for (ChatMessage message : messages) {
            if (message instanceof ToolExecutionResultMessage toolResult) {
                String shortened = shorten(toolResult);
                if (shortened != null) {
                    // 只换正文，协议字段原样保留
                    compressed.add(ToolExecutionResultMessage.builder()
                            .id(toolResult.id())
                            .toolName(toolResult.toolName())
                            .text(shortened)
                            .isError(toolResult.isError())
                            .attributes(toolResult.attributes())
                            .build());
                    changed = true;
                    continue;
                }
            }
            compressed.add(message);
        }

        return changed ? request.toBuilder().messages(compressed).build() : request;
    }

    /** 头尾各留一半 */
    private String shorten(ToolExecutionResultMessage toolResult) {
        String text = toolResult.text();
        if (text == null || text.length() <= maxToolResultChars) {
            return null;
        }
        if (text.contains(CHART_PREFIX)) {
            return null;
        }

        int keepEachSide = maxToolResultChars / 2;
        String head = text.substring(0, keepEachSide);
        String tail = text.substring(text.length() - keepEachSide);
        int omitted = text.length() - keepEachSide * 2;

        compressedCharsCounter.increment(omitted);
        compressedMessagesCounter.increment();
        log.info("上下文压缩 | 工具：{} | 原长：{} 字符 | 省略：{} 字符 | 压缩后：{} 字符",
                toolResult.toolName(), text.length(), omitted, head.length() + tail.length());

        return head + String.format(ELLIPSIS_TEMPLATE, omitted, omitted) + tail;
    }
}

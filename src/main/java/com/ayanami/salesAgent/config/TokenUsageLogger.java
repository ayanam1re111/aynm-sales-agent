package com.ayanami.salesAgent.config;

import dev.langchain4j.model.chat.listener.ChatModelListener;
import dev.langchain4j.model.chat.listener.ChatModelResponseContext;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class TokenUsageLogger implements ChatModelListener {//AI模型监听器接口

    private final Counter inputTokenCounter;//输入token计数器
    private final Counter outputTokenCounter;//输出token计数器

    public TokenUsageLogger(MeterRegistry meterRegistry) {//Micrometer 指标注册中心
        this.inputTokenCounter = Counter.builder("llm.tokens.input")//创建一个计数器并赋名
                .description("Input tokens consumed")
                .register(meterRegistry);//注册到监控系统
        this.outputTokenCounter = Counter.builder("llm.tokens.output")
                .description("Output tokens consumed")
                .register(meterRegistry);
    }

    @Override
    //onResponse():AI接口调用完成、返回结果时自动执行
    public void onResponse(ChatModelResponseContext responseContext) {
        var usage = responseContext.chatResponse().tokenUsage();
        //获取输入/输出Token数
        if (usage != null) {
            int input = usage.inputTokenCount() != null ? usage.inputTokenCount() : 0;
            int output = usage.outputTokenCount() != null ? usage.outputTokenCount() : 0;
            //累加监控指标
            inputTokenCounter.increment(input);
            outputTokenCounter.increment(output);

            // 估算费用（qwen-max 价格：输入 0.04 元/千Token，输出 0.12 元/千Token）
            double cost = input * 0.04 / 1000.0 + output * 0.12 / 1000.0;
            log.info("Token 用量 | 输入：{} | 输出：{} | 本次费用约：¥{}",
                    input, output, String.format("%.4f", cost));
        }
    }
}
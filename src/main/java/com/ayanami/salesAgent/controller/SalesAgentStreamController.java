package com.ayanami.salesAgent.controller;

import com.ayanami.salesAgent.agent.SalesAgent;
import dev.langchain4j.service.TokenStream;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.FluxSink;

import java.time.LocalDate;

@RestController
@RequestMapping("/agent")
@RequiredArgsConstructor
@Slf4j
public class SalesAgentStreamController {

    private final SalesAgent salesAgent;

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)//produces...声明返回SSE流式事件流
    public Flux<ServerSentEvent<String>> chatStream(@Valid @RequestBody ChatRequest request) {

        log.info("流式请求: sessionId={}", request.sessionId());

        return Flux.create(sink -> {
            //调用aiagent
            salesAgent.chatStream(request.sessionId(), request.message(), LocalDate.now().toString())
                    // 模型每【推送一次流】，这里就执行一次
                    // 每次推送的内容 = token（模型返回的一段最小流数据块）
                    // 推送频率 = 模型生成速度 + 网络
                    .onPartialResponse(token -> {
                        // 每个 token（词片）推送一个 SSE 事件到前端
                        sink.next(ServerSentEvent.<String>builder()
                                .event("token")
                                .data(token)
                                .build());
                    })
                    .onCompleteResponse(response -> {
                        // 推送结束信号
                        sink.next(ServerSentEvent.<String>builder()
                                .event("done")
                                .data("[DONE]")
                                .build());
                        sink.complete();
                        log.info("流式响应完成: sessionId={}", request.sessionId());
                    })
                    .onError(error -> {//AI出错时触发
                        log.error("流式响应出错: sessionId={}", request.sessionId(), error);
                        sink.next(ServerSentEvent.<String>builder()
                                .event("error")
                                .data("服务暂时不可用，请稍后重试")
                                .build());
                        sink.complete();
                    })
                    .start();//真正开始执行AI流式调用，不加这行AI不会开始干活
        });
    }
}
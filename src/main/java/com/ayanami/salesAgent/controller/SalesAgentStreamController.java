package com.ayanami.salesAgent.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.ayanami.salesAgent.agent.ChartPayloadCollector;
import com.ayanami.salesAgent.agent.SalesAgent;
import com.ayanami.salesAgent.security.UserContext;
import com.ayanami.salesAgent.security.UserSessionRegistry;
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
    private final UserSessionRegistry sessionRegistry;
    private final ChartPayloadCollector chartCollector;

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)//produces...声明返回SSE流式事件流
    public Flux<ServerSentEvent<String>> chatStream(@Valid @RequestBody ChatRequest request) {

        Long repId = StpUtil.getLoginIdAsLong();
        String repName = StpUtil.getSession().getString("username");
        String role = StpUtil.getSession().getString("role");
        Long regionId = StpUtil.getSession().getLong("regionId");

        log.info("流式请求: sessionId={}, repId={}, repName={}, role={}",
                request.sessionId(), repId, repName, role);

        // 登记到会话表：工具会被切到 LangChain4j 的线程池执行，靠这份登记在自己的线程上还原身份
        sessionRegistry.register(request.sessionId(),
                new UserContext.UserInfo(repId, repName, role, regionId, repId));

        return Flux.create(sink -> {
            //调用aiagent
            salesAgent.chatStream(request.sessionId(), request.message(),
                    LocalDate.now().toString(), repId, repName, role)
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
                    // 图表工具一执行完就把它生成的 option 下发，不等整段回复结束 ——
                    // 这样前端拿到 [[CHART]] 占位符时图表已经在手，能边流边渲染
                    .onToolExecuted(exec -> {
                        for (String payload : chartCollector.drain(request.sessionId())) {
                            sink.next(ServerSentEvent.<String>builder()
                                    .event("chart")
                                    .data(payload)
                                    .build());
                        }
                    })
                    .onCompleteResponse(response -> {
                        // 推送结束信号
                        sink.next(ServerSentEvent.<String>builder()
                                .event("done")
                                .data("[DONE]")
                                .build());
                        sink.complete();
                        sessionRegistry.unregister(request.sessionId());
                        log.info("流式响应完成: sessionId={}", request.sessionId());
                    })
                    .onError(error -> {//AI出错时触发
                        log.error("流式响应出错: sessionId={}", request.sessionId(), error);
                        sink.next(ServerSentEvent.<String>builder()
                                .event("error")
                                .data("服务暂时不可用，请稍后重试")
                                .build());
                        sink.complete();
                        sessionRegistry.unregister(request.sessionId());
                        // 中断时可能还有没被 onToolExecuted 取走的图表，留在 map 里就是泄漏
                        chartCollector.clear(request.sessionId());
                    })
                    .start();//真正开始执行AI流式调用，不加这行AI不会开始干活
        });
    }
}
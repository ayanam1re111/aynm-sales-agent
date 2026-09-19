package com.ayanami.salesAgent.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.ayanami.salesAgent.agent.ChartPayloadCollector;
import com.ayanami.salesAgent.agent.SalesAgent;
import com.ayanami.salesAgent.memory.MysqlChatMemoryStore;
import com.ayanami.salesAgent.security.UserContext;
import com.ayanami.salesAgent.security.UserSessionRegistry;

import com.ayanami.salesAgent.controller.ChatRequest;
import com.ayanami.salesAgent.controller.ChatResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/agent")
@RequiredArgsConstructor
@Slf4j
public class SalesAgentController {

    private static final Pattern CHART_PLACEHOLDER = Pattern.compile("\\[\\[\\s*CHART\\s*\\]\\]", Pattern.CASE_INSENSITIVE);

    private final SalesAgent salesAgent;
    private final MysqlChatMemoryStore chatMemoryStore;
    private final UserSessionRegistry sessionRegistry;
    private final ChartPayloadCollector chartCollector;

    /** 把 [[CHART]] 占位符就地换成图表 JSON。同步接口没有第二条通道，只能回填进正文让 reply 自包含。 */
    private String inlineCharts(String reply, List<String> charts) {
        Matcher matcher = CHART_PLACEHOLDER.matcher(reply);
        StringBuilder sb = new StringBuilder();
        int used = 0;

        while (matcher.find()) {
            // 占位符比图多时替换成空串就地删掉，否则正文里会留下 [[CHART]] 字样
            String replacement = used < charts.size() ? "CHART_JSON:" + charts.get(used++) : "";
            matcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(sb);

        // 图比占位符多（模型漏写了占位符），补到末尾，宁可位置不精确也不要丢图
        for (int i = used; i < charts.size(); i++) {
            sb.append("\nCHART_JSON:").append(charts.get(i));
        }
        return sb.toString();
    }


    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@Valid @RequestBody ChatRequest request) {
        Long repId = StpUtil.getLoginIdAsLong();
        String repName = StpUtil.getSession().getString("username");
        String role = StpUtil.getSession().getString("role");
        Long regionId = StpUtil.getSession().getLong("regionId");
        log.info("接收请求: sessionId={}, message={}, repId={}, repName={}, role={}",
                request.sessionId(), request.message(), repId, repName, role);
        long start = System.currentTimeMillis();

        // 登记到会话表：工具会被切到 LangChain4j 的线程池执行，靠这份登记在自己的线程上还原身份
        sessionRegistry.register(request.sessionId(),
                new UserContext.UserInfo(repId, repName, role, regionId, repId));

        String reply;
        try {
            reply = salesAgent.chat(request.sessionId(), request.message(),
                    LocalDate.now().toString(), repId, repName, role);
            // 同步接口没有第二条通道，图表回填进正文
            reply = inlineCharts(reply, chartCollector.drain(request.sessionId()));
        } finally {
            sessionRegistry.unregister(request.sessionId());
            chartCollector.clear(request.sessionId());
        }

        long duration = System.currentTimeMillis() - start;
        log.info("请求完成: sessionId={}, durationMs={}", request.sessionId(), duration);
        //返回给前端HTTP200成功响应并返回一个JSON格式对象
        return ResponseEntity.ok(new ChatResponse(request.sessionId(), reply, duration));
    }

    @DeleteMapping("/session/{sessionId}")
    public ResponseEntity<Map<String, String>> clearSession(@PathVariable String sessionId) {
        chatMemoryStore.deleteMessages(sessionId);
        log.info("会话记忆已清除: sessionId={}", sessionId);
        return ResponseEntity.ok(Map.of("message", "会话记忆已清除", "sessionId", sessionId));
    }
}

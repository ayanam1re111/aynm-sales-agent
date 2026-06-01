package com.ayanami.salesAgent.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.ayanami.salesAgent.agent.SalesAgent;
import com.ayanami.salesAgent.memory.MysqlChatMemoryStore;

import com.ayanami.salesAgent.controller.ChatRequest;
import com.ayanami.salesAgent.controller.ChatResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/agent")
@RequiredArgsConstructor
@Slf4j
public class SalesAgentController {

    private final SalesAgent salesAgent;
    private final MysqlChatMemoryStore chatMemoryStore;


    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@Valid @RequestBody ChatRequest request) {
        Long repId = StpUtil.getLoginIdAsLong();
        String repName = StpUtil.getSession().getString("username");
        String role = StpUtil.getSession().getString("role");
        log.info("接收请求: sessionId={}, message={}, repId={}, repName={}, role={}",
                request.sessionId(), request.message(), repId, repName, role);
        long start = System.currentTimeMillis();

        String reply = salesAgent.chat(request.sessionId(), request.message(),
                LocalDate.now().toString(), repId, repName, role);

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

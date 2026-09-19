package com.ayanami.salesAgent.security;

import dev.langchain4j.invocation.InvocationContext;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

/**
 * 会话 → 用户 的登记表。UserContext 是 ThreadLocal，工具被切到 LangChain4j 线程池执行时
 * 读不到 Servlet 线程写入的那份，所以按会话 ID 存一份，由工具在自己的执行线程上还原。
 */
@Component
public class UserSessionRegistry {

    private final ConcurrentHashMap<String, UserContext.UserInfo> bySessionId = new ConcurrentHashMap<>();

    private static volatile UserSessionRegistry instance;

    @PostConstruct
    void expose() {
        instance = this;
    }

    /** 工具在执行线程上调用：按会话 ID 把用户写进当前线程的 UserContext。context 为 null 时不做改动。 */
    public static void bindToCurrentThread(InvocationContext context) {
        UserSessionRegistry registry = instance;
        if (registry == null || context == null) return;
        registry.applyTo(String.valueOf(context.chatMemoryId()));
    }

    public void register(String sessionId, UserContext.UserInfo user) {
        if (sessionId != null && user != null) {
            bySessionId.put(sessionId, user);
        }
    }

    public void unregister(String sessionId) {
        if (sessionId != null) {
            bySessionId.remove(sessionId);
        }
    }

    /** 在工具线程上建立或清除 UserContext。查不到时必须 clear，否则会残留上一个请求的身份。 */
    public boolean applyTo(String sessionId) {
        UserContext.UserInfo user = sessionId == null ? null : bySessionId.get(sessionId);
        if (user == null) {
            UserContext.clear();
            return false;
        }
        UserContext.set(user);
        return true;
    }
}

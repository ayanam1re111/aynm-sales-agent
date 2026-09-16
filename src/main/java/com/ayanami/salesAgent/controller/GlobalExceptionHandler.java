package com.ayanami.salesAgent.controller;

import cn.dev33.satoken.exception.NotLoginException;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice//全局捕获Controller层异常的处理器
@Slf4j
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private final MeterRegistry meterRegistry;

    /** 累加运行时异常计数，按异常类型打标签，便于在 Actuator 中定位高频报错 */
    private void recordException(Exception e) {
        Counter.builder("agent.exceptions")
                .description("Runtime exceptions handled by the global handler")
                .tag("type", e.getClass().getSimpleName())
                .register(meterRegistry)
                .increment();
    }

    /**
     * 处理请求体参数校验失败异常（@Valid校验不通过时抛出）
     * @param e
     * @return
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<String> handleValidation(MethodArgumentNotValidException e) {
        recordException(e);
        //从异常中获取所有校验失败的字段信息
        String msg = e.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .findFirst().orElse("参数校验失败");//getField():返回校验失败的字段名称
        return ResponseEntity.badRequest().body(msg);
    }

    /**
     * 处理未登录请求
     * @param e
     * @return
     */
    @ExceptionHandler(NotLoginException.class)
    public ResponseEntity<String> handleNotLogin(NotLoginException e){
        recordException(e);
        log.warn("用户未登录或token已过期：{}",e.getMessage());
        return ResponseEntity.status(401).body("未登录，请先登录");
    }

    /**
     * 兜底处理：所有没有被上面专门捕获的异常，都会进入这里
     * @param e
     * @return
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleUnknown(Exception e) {
        recordException(e);
        log.error("未处理异常", e);
        return ResponseEntity.internalServerError().body("服务暂时不可用，请稍后重试");
    }
}
package com.ayanami.salesAgent.config;

import cn.dev33.satoken.interceptor.SaInterceptor;
import cn.dev33.satoken.session.SaSession;
import cn.dev33.satoken.stp.StpUtil;
import com.ayanami.salesAgent.security.UserContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@Slf4j
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Sa-Token 登录校验拦截器——白名单之外的接口都需要登录
        registry.addInterceptor(
                new SaInterceptor(handle -> StpUtil.checkLogin()))
                .addPathPatterns("/**")//拦截所有请求
                .excludePathPatterns(//放行白名单
                        "/auth/login",//登录接口
                        "/actuator/**",//监控接口
                        "/static/**"//静态资源
                );

        // 用户上下文填充拦截器——从 Sa-Token Session 读取用户信息写入 ThreadLocal
        registry.addInterceptor(new HandlerInterceptor() {
            @Override//请求进入controller之前执行
            public boolean preHandle(HttpServletRequest request,
                                     HttpServletResponse response,
                                     Object handler) {
                if (StpUtil.isLogin()) {//1.判断用户登录
                    //2.从session中读取用户信息
                    Long userId    = StpUtil.getLoginIdAsLong();
                    SaSession session = StpUtil.getSession();
                    String username = (String) session.get("username");
                    String role     = (String) session.get("role");
                    Long regionId   = session.get("regionId") instanceof Number n ? n.longValue() : null;
                    Long repId      = session.get("repId")    instanceof Number n ? n.longValue() : null;
                    //3.组装UserInfo,塞进UserContext
                    UserContext.set(new UserContext.UserInfo(userId, username, role, regionId, repId));
                    log.debug("用户已认证: userId={}, role={}", userId, role);
                }
                return true;
            }

            @Override//请求完全结束后执行
            public void afterCompletion(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Object handler, Exception ex) {
                UserContext.clear();   // 请求完成后清理 ThreadLocal，防止内存泄漏
            }
        }).addPathPatterns("/**");
    }
}
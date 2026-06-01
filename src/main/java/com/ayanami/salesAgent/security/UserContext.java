package com.ayanami.salesAgent.security;

import lombok.extern.slf4j.Slf4j;

//用户上下文：设置各种处理用户信息，权限判断方法
@Slf4j
public class UserContext {
    //每个请求线程独立存一份自己的UserInfo，互不干扰、信息隔离
    private static final ThreadLocal<UserInfo> HOLDER = new ThreadLocal<>();// 类加载阶段直接初始化，全局仅此一个对象

    public record UserInfo(Long userId, String username, String role, Long regionId, Long repId) {}
    //存用户信息
    public static void set(UserInfo info) { HOLDER.set(info); }
    //取用户信息
    public static UserInfo get() { return HOLDER.get(); }
    //清空用户信息（请求结束必须调用，防止内存泄漏）
    public static void clear() { HOLDER.remove(); }
    //权限判断方法
    public static boolean isDirector() {//销售总监
        UserInfo u = get();
        return u != null && "SALES_DIRECTOR".equals(u.role());
    }

    public static boolean isManager() {//销售经理
        UserInfo u = get();
        return u != null && "SALES_MANAGER".equals(u.role());
    }

    /**
     * 检查当前用户是否有权访问指定大区的数据
     * @param targetRegionId 目标大区ID，null 表示全公司数据
     * @return null=允许访问，非null=拒绝原因
     */
    public static String checkRegionAccess(Long targetRegionId) {
        UserInfo u = get();
        if (u == null) {
            log.warn("权限检查失败：用户未登录");
            return "用户未登录，无法执行操作";
        }
        switch (u.role()) {
            case "SALES_DIRECTOR":
                return null; // 总监可查看所有大区
            case "SALES_MANAGER":
                // 经理只能查看自己大区的数据
                if (targetRegionId != null && !targetRegionId.equals(u.regionId())) {
                    log.warn("权限拒绝：SALES_MANAGER {} 无权访问大区 {}", u.username(), targetRegionId);
                    return "您没有权限查看该大区的数据，只能查看自己管辖大区的数据";
                }
                return null;
            case "SALES_REP":
                // 销售员不能直接查询大区级别数据
                log.warn("权限拒绝：SALES_REP {} 无权访问大区级别数据", u.username());
                return "您没有权限查看大区级别数据，只能查询自己的销售数据";
            default:
                return "无法识别当前用户角色";
        }
    }

    /**
     * 检查当前用户是否有权访问指定销售员的数据
     * @param targetRepId 目标销售员ID
     * @return null=允许访问，非null=拒绝原因
     */
    public static String checkRepAccess(Long targetRepId) {
        UserInfo u = get();
        if (u == null) {
            return "用户未登录，无法执行操作";
        }
        if ("SALES_REP".equals(u.role())) {
            // 销售员只能查自己的数据
            if (targetRepId != null && !targetRepId.equals(u.repId())) {
                log.warn("权限拒绝：SALES_REP {} 无权访问销售员 {} 的数据", u.username(), targetRepId);
                return "您没有权限查看其他销售员的数据";
            }
        }
        // 经理和总监可以访问销售员数据（经理的区域限制由 checkRegionAccess 控制）
        return null;
    }

    /**
     * 获取当前用户的强制作用域大区ID
     * SALES_MANAGER 返回自己管辖的大区ID，其他角色返回 null（表示不限制）
     */
    public static Long getEnforcedRegionId() {
        UserInfo u = get();
        if (u != null && "SALES_MANAGER".equals(u.role())) {
            return u.regionId();
        }
        return null;
    }
}

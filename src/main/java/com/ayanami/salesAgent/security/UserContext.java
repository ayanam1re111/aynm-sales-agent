package com.ayanami.salesAgent.security;
//用户上下文：设置各种处理用户信息，权限判断方法
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
}
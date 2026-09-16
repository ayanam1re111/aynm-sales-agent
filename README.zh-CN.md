<div align="center">

# 智能销售数据分析 Agent

把自然语言问题转成多步工具调用，自动完成取数、统计、趋势分析与图表生成

[English](README.md) | 简体中文

![Java](https://img.shields.io/badge/Java-21-ED8B00?style=flat-square&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5-6DB33F?style=flat-square&logo=springboot&logoColor=white)
![LangChain4j](https://img.shields.io/badge/LangChain4j-1.12-1C3C3C?style=flat-square)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square&logo=mysql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)
![Sa-Token](https://img.shields.io/badge/Sa--Token-1.39-2F6FED?style=flat-square)
![Micrometer](https://img.shields.io/badge/Micrometer-4B8BBE?style=flat-square)

</div>

基于 Spring Boot + LangChain4j 的销售数据分析智能体。用户提出问题，Agent 自主决定调用哪些工具、按什么顺序调用，把数据库里的数据组织成带结论的分析回答，需要图表时直接输出 ECharts JSON。

不需要写 SQL，也不用预先定义报表 —— Agent 会自己找到该查什么、该怎么算。

## 效果示例

```
  用户 ──▶ 为什么本月业绩下滑？
             │
             ├─ getSalesSummary      查询本月总销售额与订单数
             ├─ calcMonthOverMonth   与上月做环比，定位降幅
             └─ detectAllAnomalies   检测是否存在异常波动
             │
  回答 ◀── 本月销售额 ¥1,234,567，环比下降 18.3%。
            降幅主要来自华东区（-32%），已触发「大区订单量骤降」预警。
```

## 核心能力

**多步工具编排** — 12 个工具覆盖订单查询、汇总排名、同环比趋势、图表生成、异常检测五类场景。每个工具的描述里都写明了适用与不适用场景，避免模型选错工具造成无效调用。

**权限下沉到工具入口** — 总监、经理、销售员三级角色，数据可见范围逐级收窄。权限校验不是只做在 Controller 层，而是下沉到每一个工具方法的入口，因为模型可能被诱导传入任意大区名称参数。经理角色即使不传大区参数，也会被强制限定到自己管辖的大区。

**对话记忆持久化** — 会话上下文序列化后存入 MySQL，服务重启对话不丢，支持「那华南区呢」这类追问。窗口保留最近 20 条消息，控制上下文长度。

**结果缓存** — 排名、月度趋势等高频统计查询通过 Spring Cache 缓存到 Redis，不同缓存区配置了各自的 TTL。

**流式输出** — 支持 SSE 逐 token 推送，前端可做打字机效果。

**可观测性** — Micrometer 采集 token 消耗、工具耗时（含 P95/P99 分位）、工具调用次数与全局异常计数，通过 Actuator 暴露。

> 对话正文中以 `CHART_JSON:` 开头的字符串即为图表数据，前端按前缀切分后交给 ECharts 渲染。

## 快速开始

| 依赖 | 版本 |
| :--- | :--- |
| JDK | 21+ |
| Maven | 3.8+ |
| MySQL | 8.0+ |
| Redis | 6.0+ |

**1. 建库** — 表结构与演示数据由应用启动时自动执行，脚本幂等可重复运行。

```sql
CREATE DATABASE `aynm-sales-agent`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

**2. 配置环境变量** — 密钥不落库，通过环境变量注入。

```bash
export API_KEY=sk-xxxxxxxx        # 大模型 API Key，按 application.yml 配置的供应商申请
export MYSQL_PWD=your_password
export REDIS_PWD=                 # 无密码留空
```

**3. 启动**

```bash
mvn spring-boot:run
```

默认端口 `8087`，验证：`curl http://localhost:8087/actuator/health`

## 项目结构

```
src/main/java/com/ayanami/salesAgent/
├── agent/        # SalesAgent 接口定义 + AiServices 装配（模型、工具、记忆、钩子）
├── tool/         # 12 个 @Tool 工具
├── security/     # UserContext 权限判定 + 工具入参校验
├── service/      # 销售数据查询服务
├── memory/       # MysqlChatMemoryStore 对话记忆持久化
├── config/       # 拦截器、Redis、Micrometer 指标
└── controller/   # 登录、同步 / 流式对话、全局异常处理
```

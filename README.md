<div align="center">

# Intelligent Sales Data Analysis Agent

Translates natural language questions into multi-step tool invocation workflows for data retrieval, statistical analysis, trend analysis and chart generation

English | [简体中文](README.zh-CN.md)

![Java](https://img.shields.io/badge/Java-21-ED8B00?style=flat-square&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5-6DB33F?style=flat-square&logo=springboot&logoColor=white)
![LangChain4j](https://img.shields.io/badge/LangChain4j-1.12-1C3C3C?style=flat-square)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square&logo=mysql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)
![Sa-Token](https://img.shields.io/badge/Sa--Token-1.39-2F6FED?style=flat-square)
![Micrometer](https://img.shields.io/badge/Micrometer-4B8BBE?style=flat-square)

</div>

A sales analytics agent built with Spring Boot and LangChain4j. The user asks a question, and the agent decides on its own which tools to invoke and in what order, turning raw figures from the database into an answer with conclusions — emitting ECharts JSON directly when a chart is needed.

No SQL to write, no reports to define in advance — the agent figures out what to query and how to compute it.

## Example

```
  User ──▶ Why did sales drop this month?
             │
             ├─ getSalesSummary      Query this month's total revenue and order count
             ├─ calcMonthOverMonth   Compare with last month to locate the drop
             └─ detectAllAnomalies   Check whether the fluctuation is anomalous
             │
  Reply ◀── Revenue this month was ¥1,234,567, down 18.3% MoM.
            The drop is concentrated in East China (-32%), which has
            triggered a "regional order volume plunge" alert.
```

## Key Features

**Multi-step tool orchestration** — 12 tools cover five categories: order queries, summary and rankings, MoM/YoY trends, chart generation, and anomaly detection. Each tool's description spells out when it does and does not apply, which keeps the model from picking the wrong tool and wasting a round trip.

**Permission checks at the tool boundary** — Three roles (Director, Manager, Sales Rep) with progressively narrower data visibility. Authorization is enforced at the entry of every tool method rather than only at the controller layer, because the model can be induced into passing an arbitrary region name. A manager who omits the region parameter is still confined to the region they own.

**Persistent conversation memory** — Session context is serialized into MySQL, so conversations survive a restart and follow-up questions like "what about South China?" resolve correctly. The window keeps the most recent 20 messages to bound context length.

**Query result caching** — High-frequency statistical queries such as rankings and monthly trends are cached in Redis via Spring Cache, with per-cache TTLs.

**Streaming output** — Server-Sent Events push tokens as they are generated, enabling a typewriter effect on the front end.

**Observability** — Micrometer collects token consumption, tool latency (with P95/P99 percentiles), tool invocation counts and global exception counts, exposed through Actuator.

> A string beginning with `CHART_JSON:` in the reply body is chart data. The front end splits on that prefix and hands the rest to ECharts.

## Getting Started

| Dependency | Version |
| :--- | :--- |
| JDK | 21+ |
| Maven | 3.8+ |
| MySQL | 8.0+ |
| Redis | 6.0+ |

**1. Create the database** — Schema and demo data are loaded automatically on startup; the scripts are idempotent and safe to re-run.

```sql
CREATE DATABASE `aynm-sales-agent`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

**2. Configure environment variables** — Secrets are kept out of the repository and injected via environment variables.

```bash
export API_KEY=sk-xxxxxxxx        # Model API key; obtain from the provider configured in application.yml
export MYSQL_PWD=your_password
export REDIS_PWD=                 # Leave empty if no password
```

**3. Run**

```bash
mvn spring-boot:run
```

The application listens on port `8087`. Verify with `curl http://localhost:8087/actuator/health`

## Project Structure

```
src/main/java/com/ayanami/salesAgent/
├── agent/        # SalesAgent interface + AiServices wiring (model, tools, memory, hooks)
├── tool/         # 12 @Tool implementations
├── security/     # UserContext authorization checks + tool input validation
├── service/      # Sales data query service
├── memory/       # MysqlChatMemoryStore conversation persistence
├── config/       # Interceptors, Redis, Micrometer metrics
└── controller/   # Auth, sync / streaming chat, global exception handling
```

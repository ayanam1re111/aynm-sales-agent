package com.ayanami.salesAgent.tool;

import com.ayanami.salesAgent.dto.AnomalyDTO;
import com.ayanami.salesAgent.entity.Product;
import com.ayanami.salesAgent.entity.SalesRegion;
import com.ayanami.salesAgent.entity.SalesRep;
import com.ayanami.salesAgent.repository.ProductRepository;
import com.ayanami.salesAgent.repository.SalesRegionRepository;
import com.ayanami.salesAgent.repository.SalesRepRepository;
import com.ayanami.salesAgent.security.UserContext;
import com.ayanami.salesAgent.service.SalesQueryService;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class AnomalyDetectionTool {

    private final SalesQueryService queryService;
    private final SalesRegionRepository regionRepository;
    private final SalesRepRepository repRepository;
    private final ProductRepository productRepository;

    @Value("${sales-agent.tool.anomaly-threshold-days:5}")//设定阈值
    private int zeroSaleThresholdDays;

    @Value("${sales-agent.tool.trend-drop-threshold:0.3}")
    private double trendDropThreshold;

    @Tool("自动检测销售数据中的所有异常，包括：大区订单量骤降、产品连续零销售、" +
            "销售员退单率异常、销售员业绩骤降。适用于：有没有异常、风险排查、预警检测等场景。" +
            "可指定大区名称（如 华东区）进行针对性检测，传 null 表示查全公司（仅总监可用）。")
    public String detectAllAnomalies(
            @P("大区名称，如：华东区、华南区、华北区、西南区。传 null 或空字符串表示全公司（仅总监可用）") String regionName) {

        UserContext.UserInfo user = UserContext.get();

        if (user == null) {
            log.warn("权限检查失败：用户未登录，无法执行异常检测");
            return "用户未登录，无法执行操作";
        }

        Long repId = user.repId();
        String role = user.role();

        // 解析大区名称 → ID
        Long regionId = null;
        if (regionName != null && !regionName.isBlank()) {
            regionId = queryService.getRegionIdByName(regionName);
            if (regionId == null) {
                return "未找到大区：" + regionName + "，请确认大区名称是否正确（华东区/华南区/华北区/西南区）";
            }
        }

        // 权限检查
        String accessError = UserContext.checkRegionAccess(regionId);
        if (accessError != null) return accessError;

        // SALES_MANAGER 未指定区域时默认自己的区域
        if (regionId == null && "SALES_MANAGER".equals(role)) {
            regionId = user.regionId();
            log.info("SALES_MANAGER 未指定大区，默认使用管辖大区: regionId={}", regionId);
        }

        log.info("工具调用-detectAllAnomalies: regionName={}, regionId={}, role={}", regionName, regionId, role);

        List<AnomalyDTO> anomalies = new ArrayList<>();
        //执行4个检测方法，收集所有异常，按优先级排序，拼接成一段文本返回用户
        try {
            switch (role) {
                case "SALES_DIRECTOR" -> {
                    anomalies.addAll(detectRegionDropAnomalies(null));//地区销售额下降异常
                    anomalies.addAll(detectZeroSaleProducts(null));//商品零销售异常
                    anomalies.addAll(detectHighRefundReps(null));//高退单率员工异常
                    anomalies.addAll(detectRepPerformanceDrop(null));//员工业绩下滑异常
                }
                case "SALES_MANAGER" -> {
                    anomalies.addAll(detectRegionDropAnomalies(regionId));
                    anomalies.addAll(detectZeroSaleProducts(regionId));
                    anomalies.addAll(detectHighRefundReps(regionId));
                    anomalies.addAll(detectRepPerformanceDrop(regionId));
                }
                case "SALES_REP" -> {
                    anomalies.addAll(detectHighRefundForSelf(repId));
                    anomalies.addAll(detectPerformanceDropForSelf(repId));
                }
                default -> {
                    return "无法识别当前用户角色，请重新登录";
                }
            }

        } catch (Exception e) {
            log.error("异常检测出错", e);
            return "异常检测过程中出现问题，请稍后重试";
        }

        if (anomalies.isEmpty()) {
            return "当前数据未检测到明显异常，销售数据运行正常。";
        }

        // 按优先级排序：HIGH > MEDIUM > LOW
        anomalies.sort((a, b) -> {
            //将a,b转为对应数字，重写sort方法，使其升序排列
            int order = severityOrder(a.severity()) - severityOrder(b.severity());
            return order;
        });

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("异常检测结果：共发现 %d 个异常\n\n", anomalies.size()));
        //循环每个异常，拼接字符串
        for (AnomalyDTO anomaly : anomalies) {
            String icon = switch (anomaly.severity()) {
                case "HIGH"   -> "🔴 高优先级";
                case "MEDIUM" -> "🟡 中优先级";
                default       -> "🔵 低优先级";
            };
            sb.append(String.format("%s｜%s\n", icon, anomaly.type()));
            sb.append(String.format("  对象：%s\n", anomaly.subject()));
            sb.append(String.format("  描述：%s\n", anomaly.description()));
            sb.append(String.format("  建议：%s\n\n", anomaly.suggestion()));
        }

        return sb.toString();
    }

    // ============================================================
    // 检测一：大区订单量骤降（filterRegionId 为 null 表示扫描全部大区）
    // ============================================================
    private List<AnomalyDTO>
    detectRegionDropAnomalies(Long filterRegionId) {
        List<AnomalyDTO> result = new ArrayList<>();
        LocalDate today = LocalDate.now();

        // 近 2 周 vs 过去 4 周每 2 周的平均
        LocalDate recentStart = today.minusWeeks(2);
        LocalDate recentEnd = today;
        LocalDate baseStart = today.minusWeeks(6);
        LocalDate baseEnd = today.minusWeeks(2).minusDays(1);


        List<SalesRegion> regions = filterRegionId != null
                ? regionRepository.findAllById(List.of(filterRegionId))
                : regionRepository.findAll();

        //findAll(),一次性把地区表里所有地区实体查出来，取到每个地区的地区ID，根据ID到订单表查订单量，一条一条遍历判断是否异常
        for (SalesRegion region : regions) {
            Long recentCount = queryService.queryOrderCount(region.getId(), recentStart, recentEnd);
            Long baseCount = queryService.queryOrderCount(region.getId(), baseStart, baseEnd);

            // 基准期 4 周折算成每 2 周平均
            double baseAvg = baseCount / 2.0;
            if (baseAvg < 2) continue; // 样本量太小，忽略

            double dropRate = (baseAvg - recentCount) / baseAvg;
            if (dropRate > trendDropThreshold) {
                String severity = dropRate > 0.6 ? "HIGH" : "MEDIUM";
                result.add(new AnomalyDTO(
                        "大区订单量骤降",
                        severity,
                        region.getName(),
                        String.format("近 2 周订单量 %d 笔，过去 4 周均值 %.1f 笔/两周，下降 %.0f%%",
                                recentCount, baseAvg, dropRate * 100),
                        "建议联系大区负责人确认原因，检查是否有系统问题或市场变化"
                ));
            }
        }
        return result;
    }

    // ============================================================
    // 检测二：产品连续零销售
    // ============================================================
    private List<AnomalyDTO> detectZeroSaleProducts(Long filterRegionId) {
        List<AnomalyDTO> result = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (Product product : productRepository.findByStatus("ACTIVE")) {
            LocalDate lastSaleDate = filterRegionId != null
                    ? queryService.queryLastOrderDateByRegion(product.getId(), filterRegionId)
                    : queryService.queryLastOrderDate(product.getId());
            if (lastSaleDate == null) continue; // 从未销售的新品，跳过

            long daysWithoutSale = ChronoUnit.DAYS.between(lastSaleDate, today);
            if (daysWithoutSale >= zeroSaleThresholdDays) {
                String severity = daysWithoutSale >= 14 ? "HIGH"
                        : daysWithoutSale >= 7 ? "MEDIUM" : "LOW";
                result.add(new AnomalyDTO(
                        "产品连续零销售",
                        severity,
                        product.getName() + "（" + product.getSkuCode() + "）",
                        String.format("已连续 %d 天无销售订单，上次出单日期：%s",
                                daysWithoutSale, lastSaleDate),
                        "检查产品是否下架、库存是否充足、价格是否有竞争力"
                ));
            }
        }
        return result;
    }

    // ============================================================
    // 检测三：销售员退单率异常
    // ============================================================
    private List<AnomalyDTO> detectHighRefundReps(Long filterRegionId) {
        List<AnomalyDTO> result = new ArrayList<>();
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(30);

        List<Object[]> refundData = filterRegionId != null
                ? queryService.queryRefundRatesByRegion(start, end, filterRegionId)
                : queryService.queryRefundRates(start, end);

        for (Object[] row : refundData) {
            Long repId = ((Number) row[0]).longValue();//销售员ID
            long refunded = ((Number) row[1]).longValue();//退单数量
            long total = ((Number) row[2]).longValue();//count(*)总订单

            if (total < 3) continue; // 样本量太小

            double refundRate = (double) refunded / total;
            if (refundRate > 0.15) {
                String repName = queryService.getRepName(repId);
                String severity = refundRate > 0.3 ? "HIGH" : "MEDIUM";
                result.add(new AnomalyDTO(
                        "销售员退单率异常",
                        severity,
                        repName,
                        String.format("近 30 天退单率 %.0f%%（%d/%d 单），明显高于团队平均水平",
                                refundRate * 100, refunded, total),
                        "建议与该销售员沟通了解原因，排查是否存在虚报订单或客户不满意的情况"
                ));
            }
        }
        return result;
    }

    // ============================================================
    // 检测四：销售员业绩骤降
    // ============================================================
    private List<AnomalyDTO> detectRepPerformanceDrop(Long filterRegionId) {
        List<AnomalyDTO> result = new ArrayList<>();
        LocalDate today = LocalDate.now();
        LocalDate curStart = today.minusDays(30);
        LocalDate prevStart = today.minusDays(60);
        LocalDate prevEnd = today.minusDays(31);

        List<SalesRep> reps = filterRegionId != null
                ? repRepository.findByRoleAndRegionId("SALES_REP", filterRegionId)
                : repRepository.findByRole("SALES_REP");

        //根据职位找到销售员，每一个遍历，根据取到的ID查询
        for (SalesRep rep : reps) {
            BigDecimal current = queryService.queryTotalAmount(rep.getId(),curStart, today) ; // 简化：实际应按 repId 查
            BigDecimal previous = queryService.queryTotalAmountByRep(rep.getId(), prevStart, prevEnd);
            if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) continue;
            if (current == null) current = BigDecimal.ZERO;

            double dropRate = previous.subtract(current)
                    .divide(previous, 4, BigDecimal.ROUND_HALF_UP).doubleValue();
            if (dropRate > 0.4) {
                result.add(new AnomalyDTO("销售员业绩骤降",
                        dropRate > 0.7 ? "HIGH" : "MEDIUM", rep.getName(),
                        String.format("近 30 天 ¥%.0f，上期 ¥%.0f，下降 %.0f%%", current, previous, dropRate * 100),
                        "建议跟进确认原因"));
            }
        }
        return result; // 简化返回空，完整实现在真实项目代码里
    }
    //普通销售员专用：只检测自己的退单率
    private List<AnomalyDTO> detectHighRefundForSelf(Long repId) {
        List<AnomalyDTO> result = new ArrayList<>();
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(30);

        long refunded = queryService.queryRefundCountByRep(repId, start, end);
        long total = queryService.queryOrderCountByRep(repId, start, end);
        if (total < 3) return result;

        double refundRate = (double) refunded / total;
        if (refundRate > 0.15) {
            result.add(new AnomalyDTO("您的退单率偏高",
                    refundRate > 0.3 ? "HIGH" : "MEDIUM", "本人",
                    String.format("近 30 天退单率 %.0f%%（%d/%d 单）", refundRate * 100, refunded, total),
                    "建议检查退单原因，是否有客户投诉需要跟进"));
        }
        return result;
    }
    //普通销售员专用：只检测自己的业绩变化
    private List<AnomalyDTO> detectPerformanceDropForSelf(Long repId) {
        List<AnomalyDTO> result = new ArrayList<>();
        LocalDate today = LocalDate.now();
        BigDecimal current = queryService.queryTotalAmountByRep(repId, today.minusDays(30), today);
        BigDecimal previous = queryService.queryTotalAmountByRep(repId, today.minusDays(60), today.minusDays(31));

        if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) return result;
        if (current == null) current = BigDecimal.ZERO;

        double dropRate = previous.subtract(current)
                .divide(previous, 4, BigDecimal.ROUND_HALF_UP).doubleValue();
        if (dropRate > 0.4) {
            result.add(new AnomalyDTO("您的业绩明显下滑",
                    dropRate > 0.7 ? "HIGH" : "MEDIUM", "本人",
                    String.format("近 30 天 ¥%.0f，上期 ¥%.0f，下降 %.0f%%", current, previous, dropRate * 100),
                    "建议主动梳理客户跟进情况，与主管沟通是否需要支持"));
        }
        return result;
    }


    //将风险等级映射为数字，方便排序规则
    private int severityOrder(String severity) {
        return switch (severity) {
            case "HIGH"   -> 0;
            case "MEDIUM" -> 1;
            default       -> 2;
        };
    }
}
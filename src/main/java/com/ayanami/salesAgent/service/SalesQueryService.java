package com.ayanami.salesAgent.service;


import com.ayanami.salesAgent.dto.*;

import com.ayanami.salesAgent.entity.SalesOrder;
import com.ayanami.salesAgent.entity.SalesRep;
import com.ayanami.salesAgent.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SalesQueryService {

    private final SalesOrderRepository orderRepository;
    private final SalesRepRepository repRepository;
    private final ProductRepository productRepository;
    private final SalesRegionRepository regionRepository;

    // ============================================================
    // 基础查询
    // ============================================================

    /**
     * 查询指定时段的订单列表
     * 权限过滤由调用方（工具层）传入 regionId / repId 参数决定
     */
    public List<SalesOrder> queryOrders(Long repId, Long regionId,
                                         LocalDate start, LocalDate end) {
        if (repId != null) {
            return orderRepository.findByRepIdAndOrderDateBetween(repId, start, end);
        }
        if (regionId != null) {
            return orderRepository.findByRegionIdAndOrderDateBetween(regionId, start, end);
        }
        // 全量查询（只有 SALES_DIRECTOR 角色会走到这里）
        return orderRepository.findAll().stream()
                .filter(o -> !o.getOrderDate().isBefore(start) && !o.getOrderDate().isAfter(end))
                .collect(Collectors.toList());
    }

    /**
     * 查询总销售额
     */
    public BigDecimal queryTotalAmount(Long regionId, LocalDate start, LocalDate end) {
        if (regionId != null) {
            return orderRepository.sumAmountByRegion(regionId, start, end);
        }
        return orderRepository.findAll().stream()
                .filter(o -> o.getStatus().equals("COMPLETED"))
                .filter(o -> !o.getOrderDate().isBefore(start) && !o.getOrderDate().isAfter(end))
                .map(SalesOrder::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);//初始值为0，将取到的amount全部相加，最后返回总和
    }

    // ============================================================
    // 排名查询
    // ============================================================

    /**
     * 销售员业绩排名（带姓名、大区信息）
     */
    public List<RepSalesDTO> queryRepRanking(LocalDate start, LocalDate end, int topN) {
        List<Object[]> raw = orderRepository.findRepRanking(start, end);

        // 批量查询销售员信息，避免 N+1
        Map<Long, SalesRep> repMap = repRepository.findAll().stream()
                .collect(Collectors.toMap(SalesRep::getId, r -> r));
        Map<Long, String> regionNameMap = regionRepository.findAll().stream()
                .collect(Collectors.toMap(r -> r.getId(), r -> r.getName()));
       //将数据库查到的原始数据转为前段要用的RepSalesDTO对象列表
        List<RepSalesDTO> result = new ArrayList<>();
        for (Object[] row : raw) {
            Long repId = ((Number) row[0]).longValue();
            BigDecimal total = new BigDecimal(row[1].toString());
            SalesRep rep = repMap.get(repId);
            if (rep == null) continue;

            String regionName = regionNameMap.getOrDefault(rep.getRegionId(), "未知");
            // 这里 orderCount 需要单独查，简化处理用 0
            result.add(new RepSalesDTO(repId, rep.getName(), rep.getRegionId(),
                    regionName, total, 0));

            if (result.size() >= topN) break;
        }
        return result;
    }

    /**
     * 大区业绩排名
     */
    public List<RegionSalesDTO> queryRegionRanking(LocalDate start, LocalDate end) {
        List<Object[]> raw = orderRepository.findRegionRanking(start, end);
        Map<Long, String> regionNameMap = regionRepository.findAll().stream()
                .collect(Collectors.toMap(r -> r.getId(), r -> r.getName()));

        return raw.stream().map(row -> {
            Long regionId = ((Number) row[0]).longValue();
            BigDecimal total = new BigDecimal(row[1].toString());
            String regionName = regionNameMap.getOrDefault(regionId, "未知");
            return new RegionSalesDTO(regionId, regionName, total, 0, BigDecimal.ZERO);
        }).collect(Collectors.toList());
    }

    /**
     * 产品销售排名
     */
    public List<ProductSalesDTO> queryProductRanking(LocalDate start, LocalDate end, int topN) {
        //查出商品ID，总销量，总销售额，按照销售量从大到小排名
        List<Object[]> raw = orderRepository.findProductRanking(start, end);
        //建立一个Map,取出所有的商品实体对象，方便后续直接查询，不用打到数据库
        Map<Long, com.ayanami.salesAgent.entity.Product> productMap = productRepository.findAll().stream()
                .collect(Collectors.toMap(p -> p.getId(), p -> p));
        //建立result空数组
        List<ProductSalesDTO> result = new ArrayList<>();

        for (Object[] row : raw) {
            //从查询结果里分别取出三个值
            Long productId = ((Number) row[0]).longValue();//JDBC取出来的数是以Object类型存在数组中，所以先强转为Number类型
            BigDecimal total = new BigDecimal(row[1].toString());//有小数，double会丢精度
            Integer qty = ((Number) row[2]).intValue();
            //根据取出的商品ID查询商品实体对象
            com.ayanami.salesAgent.entity.Product p = productMap.get(productId);
            if (p == null) continue;
            //加入result
            result.add(new ProductSalesDTO(productId, p.getSkuCode(), p.getName(),
                    p.getCategory(), total, qty));
            //只查前N个
            if (result.size() >= topN) break;
        }
        return result;
    }

    // ============================================================
    // 趋势分析
    // ============================================================

    /**
     * 月度趋势数据（近 N 个月）
     */
    public List<MonthlyTrendDTO> queryMonthlyTrend(Long regionId, int months) {
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusMonths(months).withDayOfMonth(1);

        List<Object[]> raw = orderRepository.findMonthlyTrend(regionId, start, end);
        return raw.stream().map(row -> new MonthlyTrendDTO(
                row[0].toString(),
                new BigDecimal(row[1].toString()),
                ((Number) row[2]).intValue()
        )).collect(Collectors.toList());
    }

    /**
     * 计算环比增长率（当期 vs 上期）
     */
    public BigDecimal calcGrowthRate(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) {
            return null; // 上期为零，无法计算
        }
        return current.subtract(previous)//当前值-前值=差额
                .divide(previous, 4, RoundingMode.HALF_UP)//差额/前值=增长率（保留四位小数，四舍五入）
                .multiply(BigDecimal.valueOf(100))//乘以100变成百分比形式
                .setScale(2, RoundingMode.HALF_UP);//保留两位小数，四舍五入
    }

    // ============================================================
    // 异常检测辅助
    // ============================================================

    /**
     * 查询产品最后一次出单日期
     */
    public LocalDate queryLastOrderDate(Long productId) {
        return orderRepository.findLastOrderDateByProduct(productId);
    }

    /**
     * 查询大区在指定时段内的订单数
     */
    public Long queryOrderCount(Long regionId, LocalDate start, LocalDate end) {
        return orderRepository.countCompletedByRegion(regionId, start, end);
    }

    /**
     * 查询所有销售员退单率
     */
    public List<Object[]> queryRefundRates(LocalDate start, LocalDate end) {
        return orderRepository.findRefundRateByRep(start, end);
    }

    // ============================================================
    // 辅助查询（名称解析）
    // ============================================================

    public String getRepName(Long repId) {
        return repRepository.findById(repId)
                .map(SalesRep::getName)
                .orElse("未知销售员");
    }

    public String getRegionName(Long regionId) {
        return regionRepository.findById(regionId)
                .map(r -> r.getName())
                .orElse("未知大区");
    }

    public Long getRegionIdByName(String regionName) {
        return regionRepository.findByName(regionName)
                .map(r -> r.getId())
                .orElse(null);
    }

    public Long getRepIdByName(String repName) {
        return repRepository.findByName(repName)
                .map(SalesRep::getId)
                .orElse(null);
    }
    
}
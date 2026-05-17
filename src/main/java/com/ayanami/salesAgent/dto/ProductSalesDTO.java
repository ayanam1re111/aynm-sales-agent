// ProductSalesDTO.java
package com.ayanami.salesAgent.dto;

import java.math.BigDecimal;

public record ProductSalesDTO(
        Long productId,
        String skuCode,
        String productName,
        String category,
        BigDecimal totalAmount,
        Integer totalQuantity
) {}
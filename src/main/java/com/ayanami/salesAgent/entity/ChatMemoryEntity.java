package com.ayanami.salesAgent.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "sa_chat_memory")
@Getter
@Setter
@NoArgsConstructor
public class ChatMemoryEntity {

    @Id//告诉JPA该字段为主键
    @GeneratedValue(strategy = GenerationType.IDENTITY)//主键由数据库自动生成且规律为递增
    private Long id;

    @Column(name = "session_id", nullable = false, unique = true, length = 100)
    private String sessionId;

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String messages;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist//新增数据插入前执行
    @PreUpdate//修改数据更新前执行
    void touch() {
        updatedAt = LocalDateTime.now();
    }
}
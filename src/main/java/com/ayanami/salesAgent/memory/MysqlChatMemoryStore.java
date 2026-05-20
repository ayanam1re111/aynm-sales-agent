package com.ayanami.salesAgent.memory;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ayanami.salesAgent.entity.ChatMemoryEntity;
import com.ayanami.salesAgent.repository.ChatMemoryRepository;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.ChatMessageDeserializer;
import dev.langchain4j.data.message.ChatMessageSerializer;
import dev.langchain4j.store.memory.chat.ChatMemoryStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class MysqlChatMemoryStore implements ChatMemoryStore {
//给langchain4j的chatmemory使用的方法
    private final ChatMemoryRepository repository;

    /**
     * 获取消息
     * @param memoryId
     * @return
     */
    @Override
    public List<ChatMessage> getMessages(Object memoryId) {
        String sessionId = memoryId.toString();
        //根据sessionID查到所有消息列表
        return repository.findBySessionId(sessionId)
                .map(entity -> {
                    try {
                        //把json格式的消息反序列化为对应实现类，最后把对象装进List<ChatMessage>
                        return ChatMessageDeserializer.messagesFromJson(entity.getMessages());
                    } catch (Exception e) {
                        log.warn("反序列化对话记忆失败，sessionId={}", sessionId, e);
                        return Collections.<ChatMessage>emptyList();
                    }
                })
                .orElse(Collections.emptyList());
    }

    /**
     * 更新消息
     * @param memoryId
     * @param messages
     */
    @Override
    public void updateMessages(Object memoryId, List<ChatMessage> messages) {
        String sessionId = memoryId.toString();
        try {
            //把消息序列化成json
            String json = ChatMessageSerializer.messagesToJson(messages);
            ChatMemoryEntity entity = repository.findBySessionId(sessionId)
                    .orElseGet(() -> {//如果查出来为空，执行以下逻辑
                        ChatMemoryEntity e = new ChatMemoryEntity();
                        e.setSessionId(sessionId);
                        return e;//新建一个chatMemoryEntity，把sessionId设进去，返回它
                    });
            entity.setMessages(json);
            repository.save(entity);
        } catch (Exception e) {
            log.error("保存对话记忆失败，sessionId={}", sessionId, e);
        }
    }

    /**
     * 删除消息
     * @param memoryId
     */
    @Override
    public void deleteMessages(Object memoryId) {
        repository.deleteBySessionId(memoryId.toString());
    }
}
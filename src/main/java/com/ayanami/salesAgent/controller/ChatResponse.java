package com.ayanami.salesAgent.controller;

public record ChatResponse(
        String sessionId,
        String reply,
        long durationMs
) {}

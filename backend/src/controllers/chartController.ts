import type { RequestHandler } from "express";
import * as chartService from "../services/chartService.js";

interface ChartDataRequest {
    tagIds: string[];
    startDate: string;
    endDate: string;
    mode?: 'realtime' | 'trend';
}

export const getChartData: RequestHandler = async (req, res, next) => {
    try {
        const { tagIds, startDate, endDate, mode } = req.body as ChartDataRequest;

        // 입력 검증
        if (!Array.isArray(tagIds) || tagIds.length === 0) {
            return res.status(400).json({ 
                ok: false, 
                error: "tagIds는 비어있지 않은 배열이어야 합니다." 
            });
        }

        if (tagIds.length > 50) {
            return res.status(413).json({ 
                ok: false, 
                error: "최대 50개의 태그만 조회할 수 있습니다." 
            });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ 
                ok: false, 
                error: "startDate와 endDate는 필수입니다." 
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ 
                ok: false, 
                error: "유효하지 않은 날짜 형식입니다." 
            });
        }

        if (start > end) {
            return res.status(400).json({ 
                ok: false, 
                error: "startDate는 endDate보다 이전이어야 합니다." 
            });
        }

        // Realtime 모드일 때는 랜덤 데이터 생성
        if (mode === 'realtime') {
            const now = Date.now();
            const realtimeData = tagIds.map(tagId => {
                // 마지막 값에 약간의 변화를 준 랜덤 값 생성 (더 자연스러운 흐름)
                const baseValue = 50 + Math.random() * 50; // 50~100 사이
                
                return {
                    tagId,
                    timestamps: [now],
                    values: [baseValue + (Math.random() - 0.5) * 10] // ±5 범위의 변화
                };
            });
            
            return res.json(realtimeData);
        }

        // 서비스 호출
        const data = await chartService.getChartData(tagIds, start, end);
        
        res.json(data);
    } catch (err) {
        console.error('차트 데이터 조회 오류:', err);
        next(err);
    }
};
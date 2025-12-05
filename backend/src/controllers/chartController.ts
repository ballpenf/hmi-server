import type { RequestHandler } from "express";
import * as chartService from "../services/chartService.js";
import SharedMemoryService from "../services/sharedMemoryService.js";

interface ChartDataRequest {
    tagIds: string[];
    startDate: string;
    endDate: string;
    mode?: 'realtime' | 'trend';
}

// 공유 메모리 서비스 싱글톤 인스턴스
let sharedMemoryService: SharedMemoryService | null = null;

// 공유 메모리 서비스 초기화
try {
    sharedMemoryService = new SharedMemoryService();
} catch (err) {
    console.error('공유 메모리 초기화 실패:', err);
    console.warn('⚠️ realtime 모드는 사용할 수 없습니다.');
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
            // const now = Date.now();
            // const realtimeData = tagIds.map(tagId => {
            //     // 마지막 값에 약간의 변화를 준 랜덤 값 생성 (더 자연스러운 흐름)
            //     const baseValue = 50 + Math.random() * 50; // 50~100 사이

            //     return {
            //         tagId,
            //         timestamps: [now],
            //         values: [baseValue + (Math.random() - 0.5) * 10] // ±5 범위의 변화
            //     };
            // });

            // return res.json(realtimeData);
            // 공유 메모리 서비스가 초기화되지 않은 경우
            if (!sharedMemoryService) {
                return res.status(503).json({
                    ok: false,
                    error: "공유 메모리 서비스를 사용할 수 없습니다. 뷰어를 먼저 실행해주세요."
                });
            }

            const now = Date.now();
            const realtimeData = tagIds.map(tagId => {
                try {
                    // tagId 형식: "id:name" 또는 숫자만 (프로젝트 구조에 따라 조정 필요)
                    let id: number;
                    let name: string;

                    // tagId가 "123:TagName" 형식인 경우
                    if (tagId.includes(':')) {
                        const [idStr, ...nameParts] = tagId.split(':');
                        id = parseInt(idStr, 10);
                        name = nameParts.join(':');
                    } else {
                        // tagId가 숫자만 있는 경우, 변수 목록에서 검색
                        const allKeys = sharedMemoryService!.keys();
                        const matchingKey = allKeys.find(key => key.startsWith(`${tagId}:`));

                        if (matchingKey) {
                            const [idStr, ...nameParts] = matchingKey.split(':');
                            id = parseInt(idStr, 10);
                            name = nameParts.join(':');
                        } else {
                            console.warn(`⚠️ 태그를 찾을 수 없음: ${tagId}`);
                            return {
                                tagId,
                                timestamps: [now],
                                values: [0]
                            };
                        }
                    }

                    // 공유 메모리에서 실시간 값 가져오기
                    const currentValue = sharedMemoryService!.get(id, name);

                    return {
                        tagId,
                        timestamps: [now],
                        values: [currentValue ?? 0]
                    };
                } catch (err) {
                    console.error(`태그 ${tagId} 읽기 오류:`, err);
                    return {
                        tagId,
                        timestamps: [now],
                        values: [0]
                    };
                }
            });

            return res.json(realtimeData);
        } else if (mode === 'trend') {
            // 서비스 호출
            const data = await chartService.getChartData(tagIds, start, end);

            return res.json(data);
        }
    } catch (err) {
        console.error('차트 데이터 조회 오류:', err);
        next(err);
    }
};
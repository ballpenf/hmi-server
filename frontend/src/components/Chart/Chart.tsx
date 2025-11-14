import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import type { Shape } from "../../types/shape";
import type { EChartsOption, LineSeriesOption } from "echarts";

type ChartShape = Extract<Shape, { type: 'chart' }>;

interface ChartComponentProps {
    node: ChartShape;
    dateRange?: {
        start: string;
        end: string;
    };
}

interface DataPoint {
    secondsAgo: number; // 몇 초 전인지
    value: number;
}

export default function ChartComponent({ node, dateRange }: ChartComponentProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<echarts.ECharts | null>(null);

    const [chartData, setChartData] = useState<any[]>([]);
    const isDarkMode = node.darkMode !== false;
    const chartMode = node.chartMode || 'realtime';

    // Realtime 모드용 데이터 버퍼 (최근 60초 데이터 저장)
    const dataBufferRef = useRef<Map<string, DataPoint[]>>(new Map());

    // 마지막 값 추적 (부드러운 변화를 위해)
    const lastValuesRef = useRef<Map<string, number>>(new Map());

    // 날짜 범위 계산
    const getDateRange = () => {
        if (chartMode === 'trend' && dateRange) {
            // Trend 모드: 사용자 지정 날짜 범위 사용
            return {
                startDate: new Date(dateRange.start),
                endDate: new Date(dateRange.end)
            };
        }

        if (chartMode === 'realtime') {
            // Realtime 모드: 최근 60초
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - 60 * 1000);
            return { startDate, endDate };
        }

        // 기본값: 최근 7일
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 6 * 24 * 60 * 60 * 1000);
        return { startDate, endDate };
    };

    // 데이터 로드
    useEffect(() => {
        const fetchChartData = async () => {
            if (node.type !== "chart") return;

            try {
                const { startDate, endDate } = getDateRange();

                // 태그 ID들 추출
                const tagIds = node.series
                    .map(s => s.dataID)
                    .filter(id => id !== undefined);

                if (tagIds.length === 0) {
                    throw new Error("태그 ID가 없습니다.");
                }

                // API 호출
                const response = await fetch('/api/chart/getChartData', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        tagIds,
                        startDate: startDate.toISOString(),
                        endDate: endDate.toISOString(),
                        mode: chartMode,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (chartMode === 'realtime') {
                    // Realtime 모드: 데이터 버퍼에 추가
                    data.forEach((idx: number) => {
                        const seriesInfo = node.series[idx];
                        const tagId = seriesInfo?.dataID || `series_${idx}`;

                        if (!dataBufferRef.current.has(tagId)) {
                            dataBufferRef.current.set(tagId, []);
                        }

                        const buffer = dataBufferRef.current.get(tagId)!;

                        // 마지막 값을 기준으로 부드럽게 변화
                        let lastValue = lastValuesRef.current.get(tagId);
                        if (lastValue === undefined) {
                            lastValue = 50 + Math.random() * 50; // 초기값: 50~100
                        }

                        // 이전 값에서 ±5 범위로 변화
                        const newValue = Math.max(0, Math.min(100,
                            lastValue + (Math.random() - 0.5) * 10
                        ));

                        lastValuesRef.current.set(tagId, newValue);

                        // ✅ 모든 기존 데이터를 1초씩 뒤로 밀기
                        buffer.forEach(point => {
                            point.secondsAgo += 1;
                        });

                        // ✅ 새 데이터를 0초(오른쪽)에 추가
                        buffer.push({ secondsAgo: 0, value: newValue });

                        // ✅ 60초 이상 된 데이터 제거
                        const filtered = buffer.filter(point => point.secondsAgo <= 60);
                        dataBufferRef.current.set(tagId, filtered);
                    });

                    // 버퍼에서 차트 데이터 생성
                    const bufferedData = Array.from(dataBufferRef.current.entries()).map(([tagId, points]) => ({
                        tagId,
                        data: points.map(p => [p.secondsAgo, p.value])
                    }));

                    setChartData(bufferedData);
                } else {
                    // Trend 모드: 기존 방식
                    const trendData = data.map((item: any) => ({
                        tagId: item.tagId,
                        data: item.values.map((value: number, i: number) => [
                            item.timestamps?.[i],
                            value
                        ])
                    }));
                    setChartData(trendData);
                }

            } catch (err) {
                console.error('차트 데이터 로드 실패:', err);
            }
        };

        if (chartMode === 'trend') {
            // Trend 모드: 초기 데이터 로드
            fetchChartData();
        } else {
            // Realtime 모드: 빈 차트로 시작
            const initRealtimeData = () => {
                const initialData: any[] = [];

                node.series.forEach((seriesInfo, idx) => {
                    const tagId = seriesInfo.dataID || `series_${idx}`;

                    // 빈 버퍼 초기화
                    dataBufferRef.current.set(tagId, []);

                    initialData.push({
                        tagId,
                        data: []
                    });
                });

                setChartData(initialData);
            };

            initRealtimeData();

            // 1초마다 새 데이터 추가
            const interval = setInterval(fetchChartData, 1000);
            return () => clearInterval(interval);
        }
    }, [node.series, dateRange, chartMode]); // dateRange 의존성 추가

    // 데이터 로드
    useEffect(() => {
        const fetchChartData = async () => {
            if (node.type !== "chart") return;

            try {
                const { startDate, endDate } = getDateRange();

                const tagIds = node.series
                    .map(s => s.dataID)
                    .filter(id => id !== undefined);

                if (tagIds.length === 0) {
                    throw new Error("태그 ID가 없습니다.");
                }

                const response = await fetch('/api/chart/getChartData', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        tagIds,
                        startDate: startDate.toISOString(),
                        endDate: endDate.toISOString(),
                        mode: chartMode,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (chartMode === 'realtime') {
                    // Realtime 모드: 데이터 버퍼에 추가
                    data.forEach((idx: number) => {
                        const seriesInfo = node.series[idx];
                        const tagId = seriesInfo?.dataID || `series_${idx}`;

                        if (!dataBufferRef.current.has(tagId)) {
                            dataBufferRef.current.set(tagId, []);
                        }

                        const buffer = dataBufferRef.current.get(tagId)!;

                        // 마지막 값을 기준으로 부드럽게 변화
                        let lastValue = lastValuesRef.current.get(tagId);
                        if (lastValue === undefined) {
                            lastValue = 50 + Math.random() * 50; // 초기값: 50~100
                        }

                        // 이전 값에서 ±5 범위로 변화
                        const newValue = Math.max(0, Math.min(100,
                            lastValue + (Math.random() - 0.5) * 10
                        ));
                        
                        lastValuesRef.current.set(tagId, newValue);

                        // ✅ 모든 기존 데이터를 1초씩 뒤로 밀기
                        buffer.forEach(point => {
                            point.secondsAgo += 1;
                        });

                        // ✅ 새 데이터를 0초(오른쪽)에 추가
                        buffer.push({ secondsAgo: 0, value: newValue });

                        // ✅ 60초 이상 된 데이터 제거
                        const filtered = buffer.filter(point => point.secondsAgo <= 60);
                        dataBufferRef.current.set(tagId, filtered);
                    });

                    // 버퍼에서 차트 데이터 생성
                    const bufferedData = Array.from(dataBufferRef.current.entries()).map(([tagId, points]) => ({
                        tagId,
                        data: points.map(p => [p.secondsAgo, p.value])
                    }));

                    setChartData(bufferedData);
                } else {
                    // Trend 모드: 기존 방식
                    const trendData = data.map((item: any) => ({
                        tagId: item.tagId,
                        data: item.values.map((value: number, i: number) => [
                            item.timestamps?.[i],
                            value
                        ])
                    }));
                    setChartData(trendData);
                }

            } catch (err) {
                console.error('차트 데이터 로드 실패:', err);
            }
        };

        if (chartMode === 'trend') {
            // Trend 모드: 초기 데이터 로드
            fetchChartData();
        } else {
            // Realtime 모드: 빈 차트로 시작
            const initRealtimeData = () => {
                const initialData: any[] = [];

                node.series.forEach((seriesInfo, idx) => {
                    const tagId = seriesInfo.dataID || `series_${idx}`;

                    // 빈 버퍼 초기화
                    dataBufferRef.current.set(tagId, []);

                    initialData.push({
                        tagId,
                        data: []
                    });
                });

                setChartData(initialData);
            };

            initRealtimeData();

            // 1초마다 새 데이터 추가
            const interval = setInterval(fetchChartData, 1000);
            return () => clearInterval(interval);
        }
    }, [node.series, chartMode, dateRange]);

    // 차트 옵션은 chartData가 변경될 때마다 업데이트
    useEffect(() => {
        if (!chartInstanceRef.current || node.type !== "chart") return;

        const isRealtime = chartMode === 'realtime';

        // 시리즈 구성
        const seriesConfig: LineSeriesOption[] = chartData.map((item, idx) => {
            const seriesInfo = node.series[idx] || {};

            return {
                name: seriesInfo.name,
                type: "line",
                symbol: 'none',
                sampling: isRealtime ? 'lttb' : 'max',
                data: item.data,
                lineStyle: {
                    color: seriesInfo.color || '#5470c6',
                    width: 2
                },
                itemStyle: {
                    color: seriesInfo.color || '#5470c6'
                }
            };
        });

        const { startDate, endDate } = getDateRange();

        const option: EChartsOption = {
            animation: false,
            tooltip: {
                trigger: "axis"
            },
            legend: {
                data: node.series.map((s) => s.name),
                top: '20'
            },
            ...(isRealtime ? {} : {
                toolbox: {
                    feature: {
                        dataZoom: {
                            yAxisIndex: 'none'
                        },
                        restore: {},
                        saveAsImage: {}
                    }
                }
            }),
            xAxis: isRealtime ? {
                name: '초',
                type: 'value',
                min: 0,
                max: 60,
                interval: 10, // 10초 간격
                inverse: true, // ✅ 역순: 60(왼쪽) -> 0(오른쪽)
                axisLabel: {
                    formatter: '{value}'
                },
                splitLine: {
                    show: true
                }
            } : {
                name: '시간',
                type: 'time',
                min: startDate.getTime(),
                max: endDate.getTime(),
            },
            yAxis: {
                name: '값',
                type: "value",
            },
            dataZoom: isRealtime ? undefined : [
                {
                    type: 'inside',
                    start: 0,
                    end: 100
                },
                {
                    type: 'slider',
                    start: 0,
                    end: 100
                }
            ],
            series: seriesConfig,
        };

        // ✅ notMerge: false, lazyUpdate: true로 부드러운 업데이트
        chartInstanceRef.current.setOption(option, { notMerge: false, lazyUpdate: true });

    }, [chartData, node, chartMode]);

    // 차트 초기화
    useEffect(() => {
        if (!chartRef.current) return;

        // 기존 인스턴스 제거
        if (chartInstanceRef.current) {
            chartInstanceRef.current.dispose();
        }

        // 테마에 따라 차트 초기화 (dark 또는 기본 테마)
        const theme = isDarkMode ? 'dark' : undefined;
        chartInstanceRef.current = echarts.init(chartRef.current, theme);

        const handleResize = () => {
            chartInstanceRef.current?.resize();
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    useEffect(() => {
        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.dispose();
                chartInstanceRef.current = null;
            }
        };
    }, []);

    return (
        <div
            ref={chartRef}
            style={{
                width: "100%",
                height: "100%"
            }}
        />
    );
}
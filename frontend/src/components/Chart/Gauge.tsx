import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import type { Shape } from '../../types/shape';
import type { EChartsOption } from 'echarts';

type GaugeShape = Extract<Shape, { type: 'gauge' }>;

interface GaugeComponentProps {
    node: GaugeShape;
}

export default function GaugeComponent({ node }: GaugeComponentProps) {
    const gaugeRef = useRef<HTMLDivElement>(null);
    const gaugeInstanceRef = useRef<echarts.ECharts | null>(null);
    const [gaugeValue, setGaugeValue] = useState<number>(node.value);

    const isDarkMode = node.darkMode === true;

    // 공유메모리에서 데이터 가져오기
    useEffect(() => {
        const fetchGaugeData = async () => {
            if (node.type !== "gauge") return;

            try {
                if (node.dataID) {
                    const response = await fetch('/api/chart/getChartData', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            tagIds: [node.dataID],
                            startDate: new Date().toISOString(),
                            endDate: new Date().toISOString(),
                            mode: 'realtime',
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();

                    if (data && data.length > 0 && data[0].values && data[0].values.length > 0) {
                        setGaugeValue(data[0].values[0]);
                    }
                } else {
                    setGaugeValue(node.value);
                }

            } catch (err) {
                console.error('게이지 데이터 로드 실패:', err);
            }
        };

        fetchGaugeData();

        if (node.dataID) {
            const interval = setInterval(fetchGaugeData, 1000);
            return () => clearInterval(interval);
        }
    }, [node.dataID, node.value, node.type]);

    // 차트 초기화
    useEffect(() => {
        if (!gaugeRef.current) return;

        if (gaugeInstanceRef.current) {
            gaugeInstanceRef.current.dispose();
        }

        const theme = isDarkMode ? 'dark' : undefined;
        gaugeInstanceRef.current = echarts.init(gaugeRef.current, theme);

        const handleResize = () => {
            gaugeInstanceRef.current?.resize();
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [isDarkMode]);

    // 게이지 옵션 업데이트
    useEffect(() => {
        if (!gaugeInstanceRef.current || node.type !== "gauge") return;

        // colorRanges를 ECharts 형식으로 변환
        const axisLineColors: [number, string][] = node.colorRanges && node.colorRanges.length > 0
            ? node.colorRanges.map(range => [range.threshold, range.color] as [number, string])
            : [
                [0.3, '#67e0e3'],
                [0.7, '#37a2da'],
                [1, '#fd666d']
            ];

        const axisLineWidth = node.axisLineWidth ?? 20;
        const showAxisLabel = node.showAxisLabel !== false;
        const detailFontSize = node.fontSize?.detail ?? 20;
        const axisLabelFontSize = node.fontSize?.axisLabel ?? 10;
        const splitNumber = node.splitNumber ?? 5;

        const option: EChartsOption = {
            series: [
                {
                    type: 'gauge',
                    min: node.min,
                    max: node.max,
                    splitNumber: splitNumber,
                    axisLine: {
                        lineStyle: {
                            width: axisLineWidth,
                            color: axisLineColors
                        }
                    },
                    pointer: {
                        itemStyle: {
                            color: 'auto'
                        }
                    },
                    axisTick: {
                        distance: -axisLineWidth,
                        length: 8,
                        lineStyle: {
                            color: '#fff',
                            width: 2
                        }
                    },
                    splitLine: {
                        distance: -axisLineWidth,
                        length: axisLineWidth,
                        lineStyle: {
                            color: '#fff',
                            width: 4
                        }
                    },
                    axisLabel: {
                        show: showAxisLabel,
                        color: 'inherit',
                        distance: axisLineWidth + 10,
                        fontSize: axisLabelFontSize,
                        formatter: (value: number) => {
                            return Math.round(value).toString();
                        }
                    },
                    detail: {
                        valueAnimation: true,
                        formatter: (value: number) => {
                            const roundedValue = Math.round(value);
                            return node.title ? `${roundedValue} ${node.title}` : roundedValue.toString();
                        },
                        color: 'inherit',
                        fontSize: detailFontSize
                    },
                    data: [
                        {
                            value: gaugeValue,
                            name: node.title || ''
                        }
                    ]
                }
            ]
        };

        gaugeInstanceRef.current.setOption(option, { notMerge: false, lazyUpdate: true });

    }, [
        gaugeValue,
        node.min,
        node.max,
        node.title,
        node.colorRanges,
        node.axisLineWidth,
        node.showAxisLabel,
        node.fontSize,
        node.splitNumber,
        isDarkMode,
        node.type
    ]);

    // 클린업
    useEffect(() => {
        return () => {
            if (gaugeInstanceRef.current) {
                gaugeInstanceRef.current.dispose();
                gaugeInstanceRef.current = null;
            }
        };
    }, []);

    return (
        <div
            ref={gaugeRef}
            style={{
                width: "100%",
                height: "100%",
                pointerEvents: 'none'
            }}
        />
    );
}
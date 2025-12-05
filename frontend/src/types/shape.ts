import type { CSSProperties } from "react";
interface BindingEnumEntry {
  text?: string;
  backgroundColor?: string;
  color?: string;
}

interface Binding {
  enum?: Record<string, BindingEnumEntry>;
  default?: BindingEnumEntry;
  // 추후 ranges, format, visibility 등 확장 가능
}

export type Command =
  | { type: "toggle"; values: (string | number)[] }
  | { type: "set"; value: string | number }
  | { type: "cycle"; values: (string | number)[] };

interface CommonShapeBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  dataID?: string;
  style?: CSSProperties;
  binding?: Binding;
  command?: Command;
  display?: string;
}

// 차트 모드 타입 정의
export type ChartMode = 'realtime' | 'trend';

// 차트 선 스타일 타입 정의
export type LineStyle = 'solid' | 'dashed' | 'dotted';

// 차트 축 설정 타입 정의
export interface AxisSettings {
  yAxisMin?: number | 'auto';
  yAxisMax?: number | 'auto';
  showGridLines?: boolean;
}

// 차트 데이터 포인트 설정 타입 정의
export interface DataPointSettings {
  showMarker?: boolean;
  markerSize?: number;
  markerShape?: 'circle' | 'rect' | 'triangle' | 'diamond';
  showLabel?: boolean;
}

// 차트 시리즈 타입 정의
export interface ChartSeries {
  name: string;
  data: number[];
  dataID?: string;
  color?: string;
}

// 게이지 컬러 타입 정의
export interface GaugeColorRange {
  threshold: number;
  color: string;
}

// 게이지 폰트 크기 타입 정의
export interface GaugeFontSize {
  detail: number;
  axisLabel: number;
}

export type Shape =
  | (CommonShapeBase & { type: "circle"; text: string })
  | (CommonShapeBase & { type: "square"; text: string })
  | (CommonShapeBase & { type: "input"; placeholder?: string; value?: string })
  | (CommonShapeBase & { type: "textarea"; value?: string })
  | (CommonShapeBase & { type: "image"; src: string })
  | (CommonShapeBase & {
    type: "button";
    text: string;
    value?: string | number;
  })
  | (CommonShapeBase & { type: "label" })
  | (CommonShapeBase & { type: "pcs_on" })
  | (CommonShapeBase & { type: "pcs_off" })
  | (CommonShapeBase & { type: "battery"; value: number })
  | (CommonShapeBase & {
    type: 'chart';
    series: ChartSeries[];
    dateRange?: {
      start: string;
      end: string;
    };
    darkMode?: boolean;
    chartMode: ChartMode;
    lineWidth?: number;        // 선 굵기 
    lineStyle?: LineStyle;     // 선 스타일 
    areaOpacity?: number;      // 영역 채우기 투명도 
    axisSettings?: AxisSettings;
    dataPointSettings?: DataPointSettings;
  })
  | (CommonShapeBase & {
    type: 'dateRangeSearch';
    startDate?: string;
    endDate?: string;
    linkedChartId?: string;
  })
  | (CommonShapeBase & {
    type: 'gauge';
    value: number;
    min: number;
    max: number;
    title?: string;
    darkMode?: boolean;
    showAxisLabel?: boolean; // 눈금 숫자 라벨만 표시/숨김
    splitNumber?: number; // 눈금 개수
    axisLineWidth?: number;
    colorRanges?: GaugeColorRange[];
    fontSize?: GaugeFontSize;
  });
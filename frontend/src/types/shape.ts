// import type { CSSProperties } from "react";
// interface BindingEnumEntry {
//   text?: string;
//   backgroundColor?: string;
//   color?: string;
// }

// interface Binding {
//   enum?: Record<string, BindingEnumEntry>;
//   default?: BindingEnumEntry;
//   // 추후 ranges, format, visibility 등 확장 가능
// }

// interface BindingFunction {
//   id: string;
//   name: string;
//   tag: string;
//   description: string;
//   enum: string;
//   text: string;
//   backgroundColor: string;
//   textColor: string;
//   invisible: boolean;
// }

// export interface BindingGroupBinding {
//   groupId: string;
//   groupName: string;
//   functions: BindingFunction[];
// }

// export type Command =
//   | { type: "toggle"; values: (string | number)[] }
//   | { type: "set"; value: string | number }
//   | { type: "cycle"; values: (string | number)[] };

// interface CommonShapeBase {
//   id: string;
//   x: number;
//   y: number;
//   width: number;
//   height: number;
//   zIndex: number;
//   dataID?: string;
//   style?: CSSProperties;
//   binding?: Binding;
//   command?: Command;
//   display?: string;
// }

// export type Shape =
//   | (CommonShapeBase & { type: "circle"; text: string })
//   | (CommonShapeBase & { type: "square"; text: string })
//   | (CommonShapeBase & { type: "input"; placeholder?: string; value?: string })
//   | (CommonShapeBase & { type: "textarea"; value?: string })
//   | (CommonShapeBase & { type: "image"; src: string })
//   | (CommonShapeBase & {
//       type: "button";
//       text: string;
//       value?: string | number;
//       src?: string;
//     })
//   | (CommonShapeBase & { type: "label" })
//   | (CommonShapeBase & { type: "pcs_on" })
//   | (CommonShapeBase & { type: "pcs_off" })
//   | (CommonShapeBase & { type: "battery"; value: number });

import type { CSSProperties } from "react";
import type { ActionNode } from "./action";

/*───────────────────────────────────────────────────────────────
 * Binding Function 구조 (page.json과 완전 동일)
 *───────────────────────────────────────────────────────────────*/
export interface BindingFunction {
  id: string;
  name: string;
  tag: string;
  description: string;
  enum: string;
  text: string;
  backgroundColor: string;
  textColor: string;
  invisible: boolean;
}

/*───────────────────────────────────────────────────────────────
 * Binding Group 구조 (기본 구성)
 *───────────────────────────────────────────────────────────────*/
export interface BindingGroupBinding {
  groupId: string;
  groupName: string;
  functions: BindingFunction[];
}

export type Binding = BindingGroupBinding;
/*───────────────────────────────────────────────────────────────
 * Command 정의 (set / toggle / cycle)
 *───────────────────────────────────────────────────────────────*/

export type Command =
  | {
      targetId: string; // ⭐ 반드시 존재
      type: "set";
      value: string | number;
    }
  | {
      targetId: string; // ⭐ 반드시 존재
      type: "toggle";
      values: (string | number)[];
    }
  | {
      targetId: string; // ⭐ 반드시 존재
      type: "cycle";
      values: (string | number)[];
    };

/*───────────────────────────────────────────────────────────────
 * 공통 Shape 기본 속성
 *───────────────────────────────────────────────────────────────*/
export interface CommonShapeBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  dataID?: string;
  style?: CSSProperties;
  binding?: Binding | null;
  //command?: Command;
  display: string;
  scale: scaleGroup;
  action?: ActionNode | null;
}

/*───────────────────────────────────────────────────────────────
 * 스케일 그룹
 *───────────────────────────────────────────────────────────────*/
export interface scaleGroup {
  scale: number | null;
  unit: string | null;
  decimal: number | null;
}

/*───────────────────────────────────────────────────────────────
 * 차트 시리즈
 *───────────────────────────────────────────────────────────────*/
export interface ChartSeries {
  name: string;
  data: number[];
  color?: string;
}

/*───────────────────────────────────────────────────────────────
 * Shape 타입 전체 집합 (page.json과 동일)
 *───────────────────────────────────────────────────────────────*/
// 차트 모드 타입 정의
export type ChartMode = "realtime" | "trend";

// 차트 선 스타일 타입 정의
export type LineStyle = "solid" | "dashed" | "dotted";

// 차트 축 설정 타입 정의
export interface AxisSettings {
  yAxisMin?: number | "auto";
  yAxisMax?: number | "auto";
  showGridLines?: boolean;
}

// 차트 데이터 포인트 설정 타입 정의
export interface DataPointSettings {
  showMarker?: boolean;
  markerSize?: number;
  markerShape?: "circle" | "rect" | "triangle" | "diamond";
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
  | (CommonShapeBase & {
      type: "circle";
      text: string;
    })
  | (CommonShapeBase & {
      type: "square";
      text: string;
    })
  | (CommonShapeBase & {
      type: "input";
      placeholder?: string;
      value?: string;
    })
  | (CommonShapeBase & {
      type: "textarea";
      value?: string;
    })
  | (CommonShapeBase & {
      type: "image";
      src: string;
    })
  | (CommonShapeBase & {
      type: "button";
      text: string;
      command?: Command;
      src?: string;
    })
  | (CommonShapeBase & {
      type: "label";
    })
  | (CommonShapeBase & {
      type: "pcs";
    })
  | (CommonShapeBase & {
      type: "battery";
      value?: number;
    })
  | (CommonShapeBase & {
      type: "chart";
      series: ChartSeries[];
      dateRange?: {
        start: string;
        end: string;
      };
      darkMode?: boolean;
      chartMode: ChartMode;
      lineWidth?: number; // 선 굵기
      lineStyle?: LineStyle; // 선 스타일
      areaOpacity?: number; // 영역 채우기 투명도
      axisSettings?: AxisSettings;
      dataPointSettings?: DataPointSettings;
    })
  | (CommonShapeBase & {
      type: "dateRangeSearch";
      startDate?: string;
      endDate?: string;
      linkedChartId?: string;
    })
  | (CommonShapeBase & {
      type: "gauge";
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

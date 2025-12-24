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
    });

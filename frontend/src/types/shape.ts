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
  | (CommonShapeBase & { type: "battery"; value: number });

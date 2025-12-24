import { useState, type CSSProperties } from "react";
import type { Shape } from "../types/shape";
//import Pcs_on from "./objects/pcs_on";
//import Pcs_off from "./objects/pcs_off";
import Battery from "./objects/battery";
import Chart from "./Chart/Chart";
import DateRangeSearch from "./Chart/DateRangeSearch";
import Gauge from "./Chart/Gauge";

function baseBox(n: Shape): CSSProperties {
  return {
    position: "absolute",
    left: n.x,
    top: n.y,
    width: n.width,
    height: n.height,
    zIndex: n.zIndex ?? 0,
    overflow: "hidden",
    userSelect: "none",
  };
}

function NodeView({
  node,
  onShapeClick,
  onInputEnter,
  isPending,
  dateRanges,
  onDateRangeChange,
}: {
  node: Shape;
  onShapeClick?: (shape: Shape) => void | Promise<void>;
  onInputEnter?: (shape: Shape, text: string) => void | Promise<void>;
  isPending: boolean;
  dateRanges: Record<string, { start: string; end: string }>;
  onDateRangeChange?: (chartId: string, start: string, end: string) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});

  const styleMerged: CSSProperties = {
    ...baseBox(node),
    ...(node.style ?? {}),
  };

  switch (node.type) {
    case "circle": {
      let br: CSSProperties["borderRadius"] = "50%";
      const cand = node.style?.borderRadius;
      if (typeof cand === "string" || typeof cand === "number") br = cand;

      return (
        <div
          id={node.id}
          style={{
            ...styleMerged,
            borderRadius: br,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {node.text ?? null}
        </div>
      );
    }

    case "square":
      return (
        <div
          id={node.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...styleMerged,
          }}
        >
          {node.text ?? null}
        </div>
      );

    case "image":
      return (
        <img
          id={node.id}
          src={node.src}
          alt={node.id}
          style={{
            ...styleMerged,
            objectFit:
              (node.style as CSSProperties | undefined)?.objectFit ?? "contain",
          }}
        />
      );

    case "button": {
      const content = node.src ? (
        <img
          src={node.src}
          alt={node.text || `${node.id} 이미지`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      ) : (
        node.text ?? "Button"
      );

      return (
        <button
          id={node.id}
          style={{
            ...styleMerged,
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...(node.src ? { padding: 0 } : {}),
          }}
          disabled={isPending}
          onClick={() => {
            if (!isPending) onShapeClick?.(node);
          }}
        >
          {content}
        </button>
      );
    }

    case "input":
      return (
        <input
          id={node.id}
          value={draft[node.id] ?? String(node.value ?? "")}
          placeholder={node.placeholder}
          style={{
            ...styleMerged,
            padding: 0,
            border: 0,
            textAlign: "center",
            opacity: isPending ? 0.6 : 1,
          }}
          disabled={isPending}
          onChange={(e) => {
            setDraft((d) => ({ ...d, [node.id]: e.target.value }));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const text = draft[node.id] ?? e.currentTarget.value;
              onInputEnter?.(node, text);

              setDraft((d) => {
                const rest = { ...d };
                delete rest[node.id];
                return rest;
              });
            }
          }}
          onBlur={(e) => {
            const text = draft[node.id] ?? e.currentTarget.value;
            onInputEnter?.(node, text);

            setDraft((d) => {
              const rest = { ...d };
              delete rest[node.id];
              return rest;
            });
          }}
        />
      );

    case "textarea":
      return (
        <textarea
          id={node.id}
          defaultValue={node.value ?? ""}
          style={{ ...styleMerged, padding: 5, resize: "none" }}
          readOnly
        />
      );

    case "label":
      return <div id={node.id} style={styleMerged} />;

    case "battery":
      return (
        <Battery
          id={node.id}
          width={node.width}
          height={node.height}
          style={styleMerged}
          value={Number(node.value ?? 0)}
        />
      );

    case "chart": {
      // node.id를 키로 사용하여 해당 차트의 날짜 범위 가져오기
      const chartDateRange = dateRanges[node.id];
      return (
        <div id={node.id} style={{ ...styleMerged, border: "none" }}>
          <Chart node={node} dateRange={chartDateRange} />
        </div>
      );
    }

    case "dateRangeSearch":
      // linkedChartId를 사용하여 연결된 차트 지정
      return (
        <div
          id={node.id}
          style={{ ...styleMerged, backgroundColor: "none", border: "none" }}
        >
          <DateRangeSearch
            node={node}
            onDateRangeChange={(start, end) => {
              if (node.linkedChartId) {
                onDateRangeChange?.(node.linkedChartId, start, end);
              }
            }}
          />
        </div>
      );

    case "gauge":
      return (
        <div id={node.id} style={{ ...styleMerged, border: "none" }}>
          <Gauge node={node} />
        </div>
      );
  }
}

export default function PageRenderer({
  nodes,
  width = 1280,
  height = 720,
  onShapeClick,
  onInputEnter,
  pending,
}: {
  nodes: Shape[];
  width?: number;
  height?: number;
  onShapeClick?: (shape: Shape) => void | Promise<void>;
  onInputEnter?: (shape: Shape, text: string) => void | Promise<void>;
  pending?: Set<string>;
}) {
  // 각 차트별 날짜 범위 관리 (key: chart의 id)
  const [dateRanges, setDateRanges] = useState<
    Record<string, { start: string; end: string }>
  >(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    const defaultRange = {
      start: start.toISOString(),
      end: end.toISOString(),
    };

    // 모든 차트에 대한 초기 날짜 범위 설정
    const initialRanges: Record<string, { start: string; end: string }> = {};
    nodes.forEach((node) => {
      if (node.type === "chart") {
        initialRanges[node.id] = { ...defaultRange };
      }
    });
    return initialRanges;
  });

  const handleDateRangeChange = (
    chartId: string,
    start: string,
    end: string
  ) => {
    setDateRanges((prev) => ({
      ...prev,
      [chartId]: { start, end },
    }));
  };

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
      }}
    >
      {nodes.map((n) => (
        <NodeView
          key={n.id}
          node={n}
          onShapeClick={onShapeClick}
          onInputEnter={onInputEnter}
          isPending={n.dataID ? !!pending?.has(n.dataID) : false}
          dateRanges={dateRanges}
          onDateRangeChange={handleDateRangeChange}
        />
      ))}
    </div>
  );
}

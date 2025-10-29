import type { Shape } from "../../types/shape"; // ← 경로 확인!
import type { CSSProperties } from "react";

/** dataID만 수집 */
export function collectDataIds(shapes: Shape[]): string[] {
  return [
    ...new Set(shapes.map((s) => s.dataID).filter((v): v is string => !!v)),
  ];
}

/** 페이지 JSON을 서버에서 fetch */
export async function fetchPage(
  alias: string,
  signal?: AbortSignal
): Promise<Shape[]> {
  const r = await fetch(`/api/${alias}/page`, { signal });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as Shape[];
}

/** 주기적으로 값 가져오기 */
export function startValuePolling(
  ids: string[],
  onUpdate: (map: Record<string, unknown>) => void,
  { intervalMs = 3000 }: { intervalMs?: number } = {}
): () => void {
  let stop = false;

  async function tick() {
    try {
      const r = await fetch("/api/data/getValues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const map = (await r.json()) as Record<string, unknown>;
      if (!stop) onUpdate(map);
    } catch (e) {
      console.error("polling error:", e);
    }
    if (!stop) setTimeout(tick, intervalMs);
  }

  tick();
  return () => {
    stop = true;
  };
}

/* ───────────────── Binding 해석 유틸 ───────────────── */

function applyTextOrValue(shape: Shape, text: string): Shape {
  if (shape.type === "input" || shape.type === "textarea") {
    return { ...shape, value: text };
  }
  if ("text" in shape) {
    return { ...shape, text };
  }
  if (shape.type === "battery") {
    return { ...shape, value: Number(text) };
  }
  return shape;
}

function mergeStyle(
  base: Shape["style"] | undefined,
  patch: Partial<CSSProperties> | undefined
): Shape["style"] {
  if (!patch) return base;
  return { ...(base ?? {}), ...patch };
}

/** enum 기반 바인딩 적용 (새로운 배열 형식 지원) */
function applyBinding(shape: Shape, raw: unknown): Shape {
  const vStr = String(raw);
  // 1. shape.binding이 배열(BindingRow[])인지 확인합니다.
  if (shape.binding && Array.isArray(shape.binding)) {
    const bindings = shape.binding;
    // ✅ 2. raw 값(DB 값)과 'enum' 값이 일치하는 행을 찾습니다.
    const hitRow = bindings.find((row) => String(row.enum) === vStr);
    // 3. 일치하는 행이 있으면 해당 스타일을 적용하고, 없으면 기본 텍스트를 사용합니다.
    if (hitRow) {
      const nextText = hitRow.text || vStr; // text가 없으면 raw 값 사용
      const stylePatch: CSSProperties = {
        // text, backgroundColor, color를 stylePatch에 추가합니다.
        ...(hitRow.color ? { color: hitRow.color } : {}),
        ...(hitRow.backgroundColor
          ? { backgroundColor: hitRow.backgroundColor }
          : {}),
        ...(hitRow.display
          ? { display: hitRow.display === "none" ? "none" : "flex" }
          : {}),
        // 다른 스타일 속성들도 hitRow에 있다면 여기에 추가할 수 있습니다.
      };

      return {
        ...applyTextOrValue(shape, nextText), // 텍스트 업데이트
        style: mergeStyle(shape.style, stylePatch), // 기존 스타일에 변경된 스타일 합성
      };
    }
  }

  // 4. binding 속성이 배열이 아니거나, 일치하는 enum 값이 없을 경우 (기존 default 로직)
  //    (이 로직은 기존 JSON 형식의 default 객체를 처리하거나, 바인딩이 없을 때 raw 값을 텍스트로 처리하는 함수입니다.)

  // 텍스트/값 업데이트만 하는 기본 함수 실행
  return applyTextOrValue(shape, vStr);
}

/* ───────────────── 최종 병합 함수 ───────────────── */

/**
 * 값 맵을 반영한 도형 배열 만들기 (binding 포함)
 */
export function deriveMerged(
  base: Shape[] | null,
  values: Record<string, unknown>
): Shape[] | null {
  if (!base) return null;

  return base.map((s) => {
    if (!s.dataID) return s;
    const v = values[s.dataID];
    // ✅ 값이 없어도 applyBinding 호출 → default 적용 가능
    return applyBinding(s, v);
  });
}

import type { Shape, scaleGroup } from "../../types/shape";
import type { CSSProperties } from "react";

/** 모든 shape의 binding.functions[*].tag를 수집해서 unique 배열로 반환 */
export function collectTags(shapes: Shape[]): string[] {
  const tags: string[] = [];

  shapes.forEach((s) => {
    const binding = s.binding;
    if (!binding) return;

    if (Array.isArray(binding.functions)) {
      binding.functions.forEach((f) => {
        if (f.tag && typeof f.tag === "string" && f.tag.trim() !== "") {
          tags.push(f.tag);
        }
      });
    }
  });

  return [...new Set(tags)];
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
export function startValuePollingByTags(
  tags: string[],
  onUpdate: (map: Record<string, unknown>) => void,
  { intervalMs = 3000 }: { intervalMs?: number } = {}
): () => void {
  let stop = false;

  async function tick() {
    try {
      const r = await fetch("/api/data/getValues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
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

function mergeStyle(
  base: Shape["style"] | undefined,
  patch: Partial<CSSProperties> | undefined
): Shape["style"] {
  if (!patch) return base;
  return { ...(base ?? {}), ...patch };
}

// 스케일/소수점/단위를 적용해주는 함수
const formatScaledValue = (value: unknown, config?: scaleGroup): string => {
  // 1. 값이 숫자가 아니면(예: undefined, "Error") 그냥 문자열로 반환
  const numValue = Number(value);
  if (
    isNaN(numValue) ||
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return String(value ?? "");
  }

  // 2. 배율(Scale) 적용 (기본값 1)
  // config가 없거나 scale이 null이면 1로 계산
  const scale =
    config?.scale !== null && config?.scale !== undefined ? config.scale : 1;
  const calculated = numValue * scale;

  // 3. 소수점(Decimal) 처리
  // toFixed는 문자열을 반환합니다.
  let resultStr = String(calculated);
  if (config?.decimal !== null && config?.decimal !== undefined) {
    resultStr = calculated.toFixed(config.decimal);
  }

  // 4. 단위(Unit) 붙이기
  if (config?.unit) {
    resultStr = `${resultStr} ${config.unit}`; // 예: "100" + "%" -> "100%"
  }

  return resultStr;
};

function applyBindingByTag(
  shape: Shape,
  valuesByTag: Record<string, unknown>
): Shape {
  const binding = shape.binding;

  // 1. 바인딩 설정이 아예 없으면 -> 툴에서 설정한 원본 그대로 리턴
  if (
    !binding ||
    !Array.isArray(binding.functions) ||
    binding.functions.length === 0
  ) {
    return shape;
  }

  // ============================================================
  // 🔥 [핵심 1] 우선순위에 따라 적용할 펑션(targetFunc) 찾기
  // ============================================================

  let specificMatch = null; // 1순위: Enum 정확 일치 (0, 1, 2)
  let wildcardMatch = null; // 2순위: 기본값 (Enum == "")

  // 현재 바인딩된 태그의 값 가져오기 (예: valuesByTag['status'] -> 1)
  // (만약 바인딩 그룹 내 펑션들이 서로 다른 태그를 쓸 수도 있다면 루프 안에서 찾아야 함.
  //  보통은 그룹 전체가 하나의 태그를 공유하거나, 각 펑션별로 태그가 지정됨.
  //  여기서는 각 펑션(f)마다 f.tag가 있다고 가정하고 루프를 돕니다.)

  for (const f of binding.functions) {
    const rawValue = valuesByTag[f.tag];

    // ⚠️ 데이터가 아직 안 들어왔으면(undefined), 이 펑션은 비교 자체가 불가능하므로 스킵
    if (rawValue === undefined) continue;

    const rawStr = String(rawValue); // "0", "1", "2" ...

    // 1) 특정 Enum 값과 일치하는지 확인 (1순위)
    if (f.enum !== undefined && f.enum !== null && String(f.enum) === rawStr) {
      specificMatch = f;
      break; // 1순위(정확 일치)를 찾았으면 즉시 종료!
    }

    // 2) 와일드카드("")인지 확인 (2순위)
    // (아직 specificMatch를 못 찾았을 때를 대비해 후보로 등록)
    if (f.enum === "") {
      wildcardMatch = f;
    }
  }

  // 최종 결정: 1순위가 있으면 쓰고, 없으면 2순위 사용
  const targetFunc = specificMatch || wildcardMatch;

  // ============================================================
  // 🔥 [핵심 2] 일치하는 바인딩 규칙이 하나도 없으면?
  // -> "툴에서 설정한 기본값(오렌지/블랙/'동작')"을 그대로 유지해야 함
  // ============================================================
  if (!targetFunc) {
    return shape;
  }

  // ============================================================
  // 🔥 [핵심 3] 결정된 펑션(targetFunc)으로 모양 덮어쓰기
  // ============================================================

  const rawValue = valuesByTag[targetFunc.tag]; // 결정된 펑션의 실제 값
  let displayText = "";

  // 텍스트 결정: 펑션에 지정된 텍스트가 있으면 쓰고, 없으면 값 자체를 포맷팅
  if (
    targetFunc.text !== "" &&
    targetFunc.text !== undefined &&
    targetFunc.text !== null
  ) {
    displayText = targetFunc.text; // 예: "정지", "동작", "대기", "데이터오류"
  } else {
    displayText = formatScaledValue(rawValue, shape.scale);
  }

  // 스타일 패치 (기존 스타일에 덮어쓰기)
  const stylePatch: CSSProperties = {
    // 펑션에 색상이 지정되어 있을 때만 덮어씀 (없으면 원본 유지)
    ...(targetFunc.textColor ? { color: targetFunc.textColor } : {}),
    ...(targetFunc.backgroundColor
      ? { backgroundColor: targetFunc.backgroundColor }
      : {}),
    ...(targetFunc.invisible
      ? { display: "none" }
      : { display: shape.display || "flex" }),
  };

  const newShape: Shape = {
    ...shape,
    style: mergeStyle(shape.style, stylePatch),
  };

  // 텍스트 적용
  if ("text" in newShape) newShape.text = displayText;
  if (newShape.type === "input" || newShape.type === "textarea")
    newShape.value = displayText;

  return newShape;
}

/* ───────────────── 최종 병합 함수 ───────────────── */
export function deriveMergedByTags(
  base: Shape[] | null,
  valuesByTag: Record<string, unknown>
): Shape[] | null {
  if (!base) return null;

  return base.map((s) => applyBindingByTag(s, valuesByTag));
}

// frontend/src/components/useHmiPage.ts
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import type { Shape } from "../types/shape";

// ⛳️ 유틸 함수들은 App.tsx에서 분리하세요! (순환참조 방지)
// 예: frontend/src/utils/hmi.ts 로 옮기고 아래처럼 import 하세요.
import {
  fetchPage, // (alias: string, signal?: AbortSignal) => Promise<Shape[]>
  collectDataIds, // (shapes: Shape[]) => string[]
  startValuePolling, // (ids: string[], cb: (map)=>void, {intervalMs}) => () => void
  deriveMerged, // (base: Shape[]|null, values: Record<string,unknown>) => Shape[]|null
} from "./utils/hmi"; // ← 경로를 프로젝트에 맞게 수정

type ValuesMap = Record<string, unknown>;

/* ---------- 모듈 스코프 유틸 (훅 바깥) ---------- */
function normalizeVal(v: unknown): string | number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return String(v);
}

function computeNextByCommand(shape: Shape, curr: unknown): unknown {
  const cmd = shape.command;
  if (!cmd) return curr;

  if (cmd.type === "toggle") {
    const [rawA, rawB = rawA] = cmd.values ?? [0, 1];
    const a = normalizeVal(rawA),
      b = normalizeVal(rawB),
      c = normalizeVal(curr);
    return c === a ? b : a;
  }

  if (cmd.type === "cycle") {
    const arr = (cmd.values ?? []).map(normalizeVal);
    if (!arr.length) return curr;
    const c = normalizeVal(curr);
    const i = arr.findIndex((x) => x === c);
    return arr[(i + 1) % arr.length];
  }

  if (cmd.type === "set") return cmd.value;
  return curr;
}

async function setValuesAPI(
  updates: { id: string; value: unknown }[],
  signal?: AbortSignal
) {
  const r = await fetch("/api/data/setValues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates }),
    signal,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json().catch(() => ({}));
}

/* ---------- 커스텀 훅 본체 (단 한 번만 export) ---------- */
export function useHmiPage(
  alias: string,
  { intervalMs = 1000 }: { intervalMs?: number } = {}
) {
  const [base, setBase] = useState<Shape[] | null>(null); // 원본 페이지
  const [ids, setIds] = useState<string[]>([]); // dataID 목록
  const [values, setValues] = useState<ValuesMap>({}); // 실시간 값
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 최신 values 보존 (토글/폴링 충돌 방지)
  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  // 1) 페이지 로드
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const shapes = await fetchPage(alias, ac.signal);
        setBase(shapes);
        setIds(collectDataIds(shapes));
      } catch (e) {
        if ((e as { name?: string }).name !== "AbortError") setErr(String(e));
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [alias]);

  // 2) 값 폴링
  useEffect(() => {
    if (ids.length === 0) return;
    const stop = startValuePolling(ids, (map) => setValues(map), {
      intervalMs,
    });
    return () => stop();
  }, [ids, intervalMs]);

  // 3) 병합 (표시 바인딩 포함)
  const merged = useMemo(() => deriveMerged(base, values), [base, values]);

  // 4) 명령 실행 (버튼/토글)
  const runCommand = useCallback(async (shape: Shape) => {
    if (!shape.dataID || !shape.command) return;
    const id = shape.dataID;
    const curr = valuesRef.current[id];
    const next = computeNextByCommand(shape, curr);

    setPending((p) => new Set(p).add(id));
    setValues((prev) => ({ ...prev, [id]: next })); // 낙관적 업데이트
    try {
      await setValuesAPI([{ id, value: next }]);
    } catch (e) {
      console.error(e);
      setValues((prev) => ({ ...prev, [id]: curr })); // 롤백
      alert("값 전송 실패");
    } finally {
      setPending((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
    }
  }, []);

  // 5) 입력값 커밋 (인풋 + 엔터)
  const commitInputValue = useCallback(async (shape: Shape, text: string) => {
    if (!shape.dataID) return;
    const id = shape.dataID;
    const prev = valuesRef.current[id];

    setPending((p) => new Set(p).add(id));
    setValues((prevMap) => ({ ...prevMap, [id]: text }));
    try {
      await setValuesAPI([{ id, value: text }]);
    } catch (e) {
      console.error(e);
      setValues((prevMap) => ({ ...prevMap, [id]: prev })); // 롤백
      alert("입력 전송 실패");
    } finally {
      setPending((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
    }
  }, []);

  return {
    base,
    ids,
    values,
    pending,
    err,
    loading,
    merged,
    runCommand,
    commitInputValue,
  };
}

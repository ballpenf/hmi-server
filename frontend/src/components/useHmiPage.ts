// frontend/src/components/useHmiPage.ts
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import type { Shape } from "../types/shape";
import { useNavigate } from "react-router-dom";
import { BrowserActionRunner } from "./utils/actionRunner";

// ⛳️ 유틸 함수들은 App.tsx에서 분리하세요! (순환참조 방지)
// 예: frontend/src/utils/hmi.ts 로 옮기고 아래처럼 import 하세요.
import {
  fetchPage, // (alias: string, signal?: AbortSignal) => Promise<Shape[]>
  //startValuePolling, // (ids: string[], cb: (map)=>void, {intervalMs}) => () => void
  //deriveMerged, // (base: Shape[]|null, values: Record<string,unknown>) => Shape[]|null
  startValuePollingByTags,
  deriveMergedByTags,
  collectTags,
} from "./utils/hmi"; // ← 경로를 프로젝트에 맞게 수정

type ValuesMap = Record<string, unknown>;

/* ---------- API 함수 (서버로 값 전송) ---------- */
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

/* ---------- 커스텀 훅 본체 ---------- */
export function useHmiPage(
  alias: string,
  { intervalMs = 1000 }: { intervalMs?: number } = {}
) {
  const [base, setBase] = useState<Shape[] | null>(null); // 원본 페이지
  const [values, setValues] = useState<ValuesMap>({}); // 실시간 값
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<string[]>([]); // 태그 목록

  const navigate = useNavigate();

  // 최신 values 보존 (Runner가 Action 실행 시 참조용)
  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  // 1) 페이지 로드
  useEffect(() => {
    setLoading(true);
    const ac = new AbortController();
    (async () => {
      try {
        const shapes = await fetchPage(alias, ac.signal);
        setBase(shapes);
        setTags(collectTags(shapes));
        setErr(null);
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
    if (tags.length === 0) return;
    const stop = startValuePollingByTags(tags, (map) => setValues(map), {
      intervalMs,
    });
    return () => stop();
  }, [tags, intervalMs]);

  // 3) 병합 (표시 바인딩 포함)
  const merged = useMemo(
    () => deriveMergedByTags(base, values),
    [base, values]
  );
  //const [popupPath, setPopupPath] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────
  // 🔥 4) 통합 액션 실행 (Action Tree) - Command 대체
  // ─────────────────────────────────────────────────────────────
  const runAction = useCallback(
    async (shape: Shape) => {
      // Action이 없으면 아무것도 안 함
      if (!shape.action) return;

      console.log("🚀 실행: Action Tree", shape.action);

      const runner = new BrowserActionRunner({
        // A. 값 읽기 (Condition 체크용)
        getValue: (tagId) => valuesRef.current[tagId],

        // B. 값 쓰기 (Set Action용)
        setValue: async (tagId, value) => {
          // 1. 낙관적 업데이트 (UI 즉시 반영)
          setPending((p) => new Set(p).add(tagId));
          setValues((prev) => ({ ...prev, [tagId]: value }));

          try {
            // 2. 서버 전송
            await setValuesAPI([{ id: tagId, value }]);
          } catch (e) {
            console.error(`[Runner] 값 전송 실패 (${tagId})`, e);
            // 실패 시 롤백 로직이 필요하다면 여기서 처리
            // setValues((prev) => ({ ...prev, [tagId]: valuesRef.current[tagId] }));
          } finally {
            setPending((p) => {
              const n = new Set(p);
              n.delete(tagId);
              return n;
            });
          }
        },

        // C. 네비게이션
        navigate: (path, type) => {
          console.log(`🔗 이동 요청: [${type}] ${path}`);

          // A. [PAGE] 현재 창에서 페이지 전환 (SPA)
          if (type === "page") {
            // App.tsx의 라우트가 path="/:alias" 이므로
            // "/" + path 로 이동하면 DynamicRouteHandler가 감지합니다.
            // 예: targetPath가 "monitoring"이면 -> "/monitoring"으로 이동
            navigate(`/${path}`);
          }

          // D. [URL] 외부 링크
          else if (type === "url") {
            const url = path.startsWith("http") ? path : `https://${path}`;
            window.open(url, "_blank");
          }

          // E. [WINDOW] 팝업 창 열기
          else if (type === "window") {
            // 1. 팝업 창 크기 설정 (기본값 800x600, 필요시 조절 가능)
            const width = 350;
            const height = 250;

            // 2. 현재 브라우저가 위치한 모니터의 시작 좌표(Offset) 구하기
            // 듀얼 모니터의 경우, 왼쪽 모니터는 좌표가 음수(-)일 수도 있고, 오른쪽은 1920부터 시작할 수도 있음
            const screenLeft =
              window.screenLeft !== undefined
                ? window.screenLeft
                : window.screenX;
            const screenTop =
              window.screenTop !== undefined
                ? window.screenTop
                : window.screenY;

            // 3. 현재 브라우저 창의 크기 가져오기
            // (screen.width 대신 innerWidth를 사용하면 '브라우저 창' 기준으로 중앙을 잡습니다)
            const windowWidth =
              window.innerWidth ||
              document.documentElement.clientWidth ||
              screen.width;
            const windowHeight =
              window.innerHeight ||
              document.documentElement.clientHeight ||
              screen.height;

            // 4. 🔥 [핵심] 중앙 좌표 계산
            // 공식: 브라우저시작점 + (창너비 / 2) - (팝업너비 / 2)
            const left = screenLeft + windowWidth / 2 - width / 2;
            const top = screenTop + windowHeight / 2 - height / 2;

            // 3. 팝업 옵션 설정 (주소창 숨김, 리사이즈 가능 등)
            const features = [
              `width=${width}`,
              `height=${height}`,
              `left=${left}`,
              `top=${top}`,
              "resizable=no", // 창 크기 조절 허용
              "scrollbars=no", // 스크롤 허용
              "menubar=no", // 메뉴바 숨김
              "toolbar=no", // 툴바 숨김
              "status=no", // 상태표시줄 숨김
              "location=no", // 주소창 숨김 (브라우저 정책에 따라 안 숨겨질 수도 있음)
            ].join(",");

            // 4. 창 열기
            // App.tsx 라우팅이 /:alias 로 되어있으므로 `/${path}`로 접근
            // 두 번째 인자는 창의 이름입니다. (같은 path면 기존 창을 재사용)
            window.open(`/${path}`, `hmi_window_${path}`, features);

            console.log(`🚀 팝업 윈도우 오픈: ${path}`);
          }

          // F. [CLOSE] 현재 창 닫기
          else if (type === "close") {
            window.close();
          }
        },
      });

      // 실행!
      await runner.execute(shape.action);
    },
    [navigate]
  );

  // 5) 입력값 커밋 (Input 엔터 + dataID 바인딩용)
  // (Input은 Action 클릭이 아니라 값을 입력하고 엔터치는 행위라 별도로 둠)
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
    values,
    pending,
    err,
    loading,
    merged,
    runAction, // 이름 변경됨 (runCommand -> runAction)
    commitInputValue,
  };
}

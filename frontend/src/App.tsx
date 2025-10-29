// frontend/src/App.tsx
import { Routes, Route } from "react-router-dom";
//import { useState } from "react";
import PageRenderer from "./components/PageRenderer";
import { useHmiPage } from "./components/useHmiPage";
import { useParams } from "react-router-dom";

/* ───────────────── TestRoute: 기존 DB 테스트 페이지는 그대로 유지 ───────────────── */
// function TestRoute() {
//   interface TooltestData {
//     id: number;
//     value: string;
//   }

//   const [err, setErr] = useState<string | null>(null);
//   const [tooltestData, setTooltestData] = useState<TooltestData | null>(null);

//   const getTooltestData = () => {
//     fetch("/api/main/getTooltestData")
//       .then((r) => {
//         if (!r.ok) throw new Error(`HTTP ${r.status}`);
//         return r.json();
//       })
//       .then((json) => setTooltestData(json))
//       .catch((e) => setErr(String(e)));
//   };

//   const handleSetTooltestData = async () => {
//     const inputEl = document.querySelector("input") as HTMLInputElement | null;
//     const input = inputEl?.value ?? "";

//     try {
//       const r = await fetch("/api/main/setTooltestData", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ input }),
//       });
//       if (!r.ok) throw new Error(`HTTP ${r.status}`);
//       getTooltestData();
//     } catch (e) {
//       setErr(String(e));
//     }
//   };

//   return (
//     <div style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
//       <h1>React + TS + Vite</h1>
//       <p>백엔드 연결 상태:</p>
//       {err && <pre>❌ {err}</pre>}
//       {!err && !tooltestData && <pre>로딩중…</pre>}
//       {tooltestData && <pre>{JSON.stringify(tooltestData, null, 2)}</pre>}

//       <button onClick={getTooltestData}>DB select 테스트</button>
//       <div>결과 : {JSON.stringify(tooltestData, null, 2)}</div>

//       <input type="text" />
//       <button onClick={handleSetTooltestData}>DB insert 테스트</button>
//     </div>
//   );
// }

// function TestRoute() {
//   const {
//     loading,
//     err,
//     merged, // binding까지 반영된 Shape[]
//     pending, // 진행 중인 dataID 집합
//     runCommand, // 버튼/토글 클릭 시 호출
//     commitInputValue, // 인풋에서 Enter 시 호출
//   } = useHmiPage("test", { intervalMs: 1000 });

//   if (loading) return <div>로딩중…</div>;
//   if (err) return <div>❌ {err}</div>;
//   if (!merged) return <div>데이터 없음</div>;

//   return (
//     <PageRenderer
//       nodes={merged}
//       onShapeClick={runCommand}
//       onInputEnter={commitInputValue}
//       pending={pending}
//     />
//   );
// }

/* ───────────────── 메인 화면: useHmiPage("main") 사용 ───────────────── */
// function MainRoute() {
//   const {
//     loading,
//     err,
//     merged, // binding까지 반영된 Shape[]
//     pending, // 진행 중인 dataID 집합
//     runCommand, // 버튼/토글 클릭 시 호출
//     commitInputValue, // 인풋에서 Enter 시 호출
//   } = useHmiPage("main", { intervalMs: 1000 });

//   if (loading) return <div>로딩중…</div>;
//   if (err) return <div>❌ {err}</div>;
//   if (!merged) return <div>데이터 없음</div>;

//   return (
//     <PageRenderer
//       nodes={merged}
//       onShapeClick={runCommand}
//       onInputEnter={commitInputValue}
//       pending={pending}
//     />
//   );
// }

function DynamicRouteHandler() {
  // 🌟 [핵심] URL 파라미터를 읽어와 alias로 사용
  const { alias } = useParams<{ alias: string }>();

  // useHmiPage 훅에 alias를 전달하여 해당 JSON 파일(예: monitorPage.json)을 로드
  const { loading, err, merged, pending, runCommand, commitInputValue } =
    useHmiPage(alias || "login", { intervalMs: 1000 });
  // 404 처리 (선택 사항: 홈 등 제외하고 모든 경로가 HMI 페이지라고 가정)
  if (!alias) {
    return <div>잘못된 접근입니다.</div>;
  }

  if (loading) return <div>{alias} 로딩중…</div>;
  if (err) return <div>❌ {err}</div>;
  if (!merged) return <div>데이터 없음</div>;

  return (
    <PageRenderer
      nodes={merged}
      onShapeClick={runCommand}
      onInputEnter={commitInputValue}
      pending={pending}
    />
  );
}

/* ───────────────── 라우터 ───────────────── */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<div>홈</div>} />
      {/* <Route path="/main" element={<MainRoute />} />
      <Route path="/test" element={<TestRoute />} />*/}
      <Route path="*" element={<div>404</div>} />
      <Route path="/:alias" element={<DynamicRouteHandler />} />
    </Routes>
  );
}

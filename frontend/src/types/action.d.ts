/*───────────────────────────────────────────────────────────────
 * 액션(로직) 타입 정의
 *───────────────────────────────────────────────────────────────*/

// 1. 액션의 종류 (Type)
export type ActionType =
  | "GROUP" // 그룹 (컨테이너)
  | "SET" // 값 설정
  | "TOGGLE" // 토글
  | "WAIT" // 대기
  | "CONDITION" // 조건문
  | "NAVIGATE" // 화면 이동
  | "SCRIPT"; // 스크립트

export type OperatorType = ">" | ">=" | "<" | "<=" | "==" | "!=" | "contains";
export type ValueSource = "static" | "tag";

// 2. 자식 참조 타입 (ID + 타입)
// "내 자식으로 올 수 있는 건 '그룹' 아니면 '액션'이다"
export interface ChildNodeRef {
  id: string;
  type: "GROUP" | "ACTION";
}

// -----------------------------------------------------------
// [Base] 모든 요소의 공통 부모
// -----------------------------------------------------------
export interface BaseActionItem {
  id: string;
  type: ActionType;
  name: string; // 표시 이름
  description?: string; // 설명
  enabled?: boolean; // 사용 여부
  children?: ChildNodeRef[];
}

// ─────────────────────────────────────────────────────────────
// [Container] 액션 그룹 (ActionGroup)
// ─────────────────────────────────────────────────────────────
export interface ActionGroup extends BaseActionItem {
  type: "GROUP";
  expanded?: boolean; // 접기/펴기 상태

  // 🔥 핵심: 자식으로 그룹(GROUP)이나 액션(ACTION)의 참조를 가짐
  children: ChildNodeRef[];

  executionMode?: "serial" | "parallel";
}

// ─────────────────────────────────────────────────────────────
// [Item] 개별 액션들 (Actions)
// ─────────────────────────────────────────────────────────────

// 1. 값 설정 (Set)
export interface SetAction extends BaseActionItem {
  type: "SET";
  targetIds: string[];
  valueSource: ValueSource;
  value: string | number | boolean;
  dataType?: "string" | "number" | "boolean";
}

// 2. 대기 (Wait)
export interface WaitAction extends BaseActionItem {
  type: "WAIT";
  duration: number; // ms
}

// 3. 조건 (Condition)
export interface ConditionAction extends BaseActionItem {
  type: "CONDITION";
  targetId: string;
  operator: OperatorType;
  referenceValue: string | number | boolean;

  // 조건 내부도 그룹/액션 참조 가능
  then: ChildNodeRef[];
  else?: ChildNodeRef[];
}

// 4. 토글 (Toggle)
export interface ToggleAction extends BaseActionItem {
  type: "TOGGLE";
  targetIds: string[];
}

// 5. 이동 (Navigate)
export interface NavigateAction extends BaseActionItem {
  type: "NAVIGATE";
  targetType: "page" | "popup" | "url" | "window" | "close";
  targetPath: string;
}

// 6. 스크립트 (Script)
export interface ScriptAction extends BaseActionItem {
  type: "SCRIPT";
  code: string;
}

// ─────────────────────────────────────────────────────────────
// 🔥 [Final] 통합 타입 정의 (용어 통일)
// ─────────────────────────────────────────────────────────────

// 1. 순수 액션 (실제 동작하는 단위)
export type Action =
  | SetAction
  | WaitAction
  | ConditionAction
  | ToggleAction
  | NavigateAction
  | ScriptAction;

// 2. 전체 아이템 (그룹 + 액션) - ID 조회용이나 통합 처리용
export type ActionItem = ActionGroup | Action;

// ─────────────────────────────────────────────────────────────
// ✅ [Final Solution] 모든 노드 타입 통합
// (그룹, 구체적인 액션들, 그리고 단순 참조까지 모두 포함)
// ─────────────────────────────────────────────────────────────
export type ActionNode = ActionItem | ChildNodeRef;

// frontend/src/utils/ActionRunner.ts

import type {
  ActionNode,
  ActionGroup,
  SetAction,
  WaitAction,
  ConditionAction,
  Action,
} from "../../types/action"; // action.d.ts 경로에 맞게 수정

// Runner가 외부 세상과 소통하기 위한 인터페이스
interface RunnerContext {
  // 현재 태그 값 읽기 (동기)
  getValue: (tagId: string) => unknown;
  // 태그 값 쓰기 (비동기 - API 호출)
  setValue: (tagId: string, value: unknown) => Promise<void>;
  // 페이지 이동
  navigate: (
    path: string,
    type: "page" | "popup" | "url" | "window" | "close"
  ) => void;
}

export class BrowserActionRunner {
  private context: RunnerContext;
  private aborted = false;

  constructor(context: RunnerContext) {
    this.context = context;
  }

  // 실행 중단 (컴포넌트 언마운트 시 등)
  abort() {
    this.aborted = true;
  }

  async execute(node: ActionNode | null | undefined): Promise<void> {
    if (!node || this.aborted) return;

    try {
      // 1. 그룹(GROUP) 처리
      if ("children" in node || node.type === "GROUP") {
        await this.runGroup(node as ActionGroup);
      }
      // 2. 개별 액션 처리
      else {
        await this.runAction(node as Action);
      }
    } catch (error) {
      console.error(`[ActionRunner] Error at node ${node.id}:`, error);
      // 에러가 나도 전체 앱이 죽지 않도록 방어
    }
  }

  private async runGroup(group: ActionGroup) {
    const mode = group.executionMode || "serial";

    if (mode === "serial") {
      for (const child of group.children) {
        if (this.aborted) break;
        await this.execute(child);
      }
    } else {
      // 병렬 실행
      await Promise.all(group.children.map((child) => this.execute(child)));
    }
  }

  private async runAction(action: Action) {
    if (this.aborted) return;

    switch (action.type) {
      case "SET":
        await this.handleSet(action);
        break;
      case "WAIT":
        await this.handleWait(action);
        break;
      case "CONDITION":
        await this.handleCondition(action);
        break;
      case "NAVIGATE":
        this.context.navigate(action.targetPath, action.targetType);
        break;
      case "SCRIPT":
        console.warn(
          "Client-side script execution is not yet implemented safely."
        );
        break;
      default:
      // console.warn("Unknown action type:", action.type);
    }
  }

  private async handleSet(action: SetAction) {
    const { targetIds, value } = action;
    const tasks = targetIds.map((id) => this.context.setValue(id, value));
    await Promise.all(tasks);
  }

  private async handleWait(action: WaitAction) {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        if (!this.aborted) resolve();
      }, action.duration);
    });
  }

  private async handleCondition(action: ConditionAction) {
    const {
      targetId,
      operator,
      referenceValue,
      then: thenNodes,
      else: elseNodes,
    } = action;

    // Context에서 현재 최신 값 가져오기
    const currentValue = this.context.getValue(targetId);

    const isTrue = this.compare(currentValue, operator, referenceValue);

    const nextNodes = isTrue ? thenNodes : elseNodes;

    if (nextNodes && nextNodes.length > 0) {
      for (const node of nextNodes) {
        if (this.aborted) break;
        await this.execute(node);
      }
    }
  }

  private compare(a: unknown, op: string, b: unknown): boolean {
    // unknown 타입을 내부에서 형변환하여 사용
    const numA = Number(a);
    const numB = Number(b);

    // 빈 문자열이거나 null/undefined일 때 isNaN 체크
    const isNum =
      !isNaN(numA) &&
      !isNaN(numB) &&
      a !== "" &&
      a !== null &&
      a !== undefined &&
      b !== "" &&
      b !== null &&
      b !== undefined;

    const valA = isNum ? numA : a;
    const valB = isNum ? numB : b;

    // 비교 연산 수행 (TS에서 unknown끼리 직접 비교가 안 될 수 있어 캐스팅 필요할 수 있음)
    // 여기서는 편의상 Primitive 타입으로 간주하고 비교
    switch (op) {
      case ">":
        return (valA as number | string) > (valB as number | string);
      case ">=":
        return (valA as number | string) >= (valB as number | string);
      case "<":
        return (valA as number | string) < (valB as number | string);
      case "<=":
        return (valA as number | string) <= (valB as number | string);
      case "==":
        // eslint-disable-next-line eqeqeq
        return valA == valB;
      case "!=":
        // eslint-disable-next-line eqeqeq
        return valA != valB;
      case "contains":
        return String(a).includes(String(b));
      default:
        return false;
    }
  }
}

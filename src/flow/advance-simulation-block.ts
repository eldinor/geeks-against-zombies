import {
  FlowGraphSceneTickEventBlock,
  type IFlowGraphOnTickEventPayload,
} from "@babylonjs/core/FlowGraph/Blocks/Event/flowGraphSceneTickEventBlock.js";
import type { FlowGraphContext } from "@babylonjs/core/FlowGraph/flowGraphContext.js";
import type { FixedStepRuntime } from "../game/runtime";

export class AdvanceSimulationBlock extends FlowGraphSceneTickEventBlock {
  constructor(
    private readonly runtime: FixedStepRuntime,
    private readonly publish: () => void,
  ) {
    super();
  }
  override _executeEvent(context: FlowGraphContext, payload: IFlowGraphOnTickEventPayload): boolean {
    const result = super._executeEvent(context, payload);
    if (this.runtime.advance(payload.deltaTime) > 0) this.publish();
    return result;
  }
  getClassName(): string {
    return "AdvanceSimulationBlock";
  }
}

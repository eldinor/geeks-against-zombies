import { FlowGraphPointerDownEventBlock } from "@babylonjs/core/FlowGraph/Blocks/Event/flowGraphPointerDownEventBlock.js";
import { FlowGraphPointerMoveEventBlock } from "@babylonjs/core/FlowGraph/Blocks/Event/flowGraphPointerMoveEventBlock.js";
import type { FlowGraphContext } from "@babylonjs/core/FlowGraph/flowGraphContext.js";
import type { PointerInfo } from "@babylonjs/core/Events/pointerEvents.js";

function pickedMetadata(context: FlowGraphContext, payload: PointerInfo): unknown {
  const scene = context.configuration.scene;
  const mesh = payload.pickInfo?.pickedMesh ?? scene.pick(scene.pointerX, scene.pointerY)?.pickedMesh;
  return mesh?.metadata ?? null;
}

export class QueueCommandBlock extends FlowGraphPointerDownEventBlock {
  constructor(private readonly pick: (metadata: unknown) => void) {
    super({ name: "QueuePlacementCommand" });
  }
  override _executeEvent(context: FlowGraphContext, payload: PointerInfo): boolean {
    const result = super._executeEvent(context, payload);
    this.pick(pickedMetadata(context, payload));
    return result;
  }
  getClassName(): string {
    return "QueuePlacementCommandBlock";
  }
}

export class PublishHoverBlock extends FlowGraphPointerMoveEventBlock {
  constructor(private readonly hover: (metadata: unknown) => void) {
    super({ name: "PublishBoardHover" });
  }
  override _executeEvent(context: FlowGraphContext, payload: PointerInfo): boolean {
    const result = super._executeEvent(context, payload);
    this.hover(pickedMetadata(context, payload));
    return result;
  }
  getClassName(): string {
    return "PublishBoardHoverBlock";
  }
}

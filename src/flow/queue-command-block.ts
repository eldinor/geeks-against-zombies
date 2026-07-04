import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import { FlowGraphMeshPickEventBlock } from "@babylonjs/core/FlowGraph/Blocks/Event/flowGraphMeshPickEventBlock.js";
import type { FlowGraphContext } from "@babylonjs/core/FlowGraph/flowGraphContext.js";
import { PointerEventTypes, type PointerInfo } from "@babylonjs/core/Events/pointerEvents.js";
import type { Observer } from "@babylonjs/core/Misc/observable.js";

export class QueueCommandBlock extends FlowGraphMeshPickEventBlock {
  private pointerDownObserver: Observer<PointerInfo> | null = null;
  private pointerMoveObserver: Observer<PointerInfo> | null = null;
  constructor(
    tiles: readonly AbstractMesh[],
    private readonly pick: (metadata: unknown) => void,
    private readonly hover: (metadata: unknown) => void,
  ) {
    super({ name: "QueuePlacementCommand", targetMesh: tiles[0] });
  }
  override _preparePendingTasks(context: FlowGraphContext): void {
    this.pointerType.setValue(PointerEventTypes.POINTERDOWN, context);
    this.pointerDownObserver = context.configuration.scene.onPointerObservable.add(
      (payload) => this._executeEvent(context, payload),
      PointerEventTypes.POINTERDOWN,
    );
    this.pointerMoveObserver = context.configuration.scene.onPointerObservable.add(
      (payload) => this.routePointer(context, payload, this.hover),
      PointerEventTypes.POINTERMOVE,
    );
  }
  override _cancelPendingTasks(context: FlowGraphContext): void {
    context.configuration.scene.onPointerObservable.remove(this.pointerDownObserver);
    context.configuration.scene.onPointerObservable.remove(this.pointerMoveObserver);
    this.pointerDownObserver = null;
    this.pointerMoveObserver = null;
  }
  private routePointer(context: FlowGraphContext, payload: PointerInfo, callback: (metadata: unknown) => void): void {
    const scene = context.configuration.scene;
    const mesh = payload.pickInfo?.pickedMesh ?? scene.pick(scene.pointerX, scene.pointerY)?.pickedMesh;
    callback(mesh?.metadata ?? null);
  }
  override _executeEvent(context: FlowGraphContext, payload: PointerInfo): boolean {
    if (payload.type !== PointerEventTypes.POINTERDOWN) return true;
    this.routePointer(context, payload, this.pick);
    return true;
  }
  getClassName(): string {
    return "QueuePlacementCommandBlock";
  }
}

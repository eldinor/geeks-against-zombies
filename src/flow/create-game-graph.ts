import type { Scene } from "@babylonjs/core/scene.js";
import { FlowGraphCoordinator } from "@babylonjs/core/FlowGraph/flowGraphCoordinator.js";
import type { FixedStepRuntime } from "../game/runtime";
import { AdvanceSimulationBlock } from "./advance-simulation-block";
import { PublishHoverBlock, QueueCommandBlock } from "./queue-command-block";

export function createGameGraph(
  scene: Scene,
  runtime: FixedStepRuntime,
  publish: () => void,
  pick: (metadata: unknown) => void,
  hover: (metadata: unknown) => void,
): FlowGraphCoordinator {
  const coordinator = new FlowGraphCoordinator({ scene });
  const tickGraph = coordinator.createGraph();
  tickGraph.createContext();
  tickGraph.addEventBlock(new AdvanceSimulationBlock(runtime, publish));
  const interactionGraph = coordinator.createGraph();
  interactionGraph.createContext();
  interactionGraph.addEventBlock(new QueueCommandBlock(pick));
  interactionGraph.addEventBlock(new PublishHoverBlock(hover));
  coordinator.start();
  return coordinator;
}

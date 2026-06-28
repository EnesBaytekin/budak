import { BaseEdge, getBezierPath, useStore, type EdgeProps } from "@xyflow/react";

export function CustomEdge(props: EdgeProps) {
  const { source, target, style } = props;

  const sourceNode = useStore((s) => s.nodeLookup.get(source));
  const targetNode = useStore((s) => s.nodeLookup.get(target));
  if (!sourceNode || !targetNode) return null;

  const sx = sourceNode.position.x + (sourceNode.width ?? 160) / 2;
  const sy = sourceNode.position.y + (sourceNode.height ?? 80) / 2;
  const tx = targetNode.position.x + (targetNode.width ?? 160) / 2;
  const ty = targetNode.position.y + (targetNode.height ?? 80) / 2;

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  });

  return (
    <>
      <BaseEdge path={edgePath} style={style} />
      {/* Only at target (child) center */}
      <circle cx={tx} cy={ty} r={4} fill="var(--color-base-300)" />
    </>
  );
}

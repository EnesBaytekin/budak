import { BaseEdge, getBezierPath, useStore, type EdgeProps } from "@xyflow/react";

export function CustomEdge(props: EdgeProps) {
  const { source, target, id, style } = props;

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

  // Gradient: parent edge → child edge (along actual line direction)
  // Opacity fades 0.25 at parent → 1.0 at child, so child end is clearly visible
  const gradId = `edge-grad-${id}`;

  return (
    <>
      <defs>
        <linearGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          x1={sx} y1={sy}
          x2={tx} y2={ty}
        >
          <stop offset="0%" stopColor="var(--budak-edge)" stopOpacity="0.25" />
          <stop offset="60%" stopColor="var(--budak-edge)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--budak-edge)" stopOpacity="1" />
        </linearGradient>
      </defs>
      <BaseEdge path={edgePath} style={{ ...style, stroke: `url(#${gradId})`, strokeWidth: 3 }} />
    </>
  );
}

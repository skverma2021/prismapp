type UnitLike = {
  description: string;
  block?: {
    description: string;
  } | null;
};

export function formatUnitLabel(unit: UnitLike) {
  return unit.block?.description ? `${unit.block.description}, ${unit.description}` : unit.description;
}

export function compareUnitsByBlockAndDescription(left: UnitLike, right: UnitLike) {
  const blockCompare = (left.block?.description ?? "").localeCompare(right.block?.description ?? "", undefined, {
    numeric: true,
    sensitivity: "base",
  });

  if (blockCompare !== 0) {
    return blockCompare;
  }

  return left.description.localeCompare(right.description, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}
export type SaleOrderWorkflowOptionSource = {
  id: string;
  name: string;
  isActive?: boolean;
  revision?: number;
  createdAt?: string;
  publishedAt?: string | null;
};

const getWorkflowTimestamp = (workflow: SaleOrderWorkflowOptionSource) => {
  const timestamp = Date.parse(workflow.publishedAt ?? workflow.createdAt ?? "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const getSaleOrderWorkflowLabel = (
  workflow: SaleOrderWorkflowOptionSource,
) => `${workflow.name} v${workflow.revision ?? 1}`;

export const buildSaleOrderWorkflowOptions = (
  workflows: SaleOrderWorkflowOptionSource[],
) =>
  [...workflows]
    .filter((workflow) => workflow.isActive !== false && Boolean(workflow.id))
    .sort((left, right) => {
      const byDate = getWorkflowTimestamp(right) - getWorkflowTimestamp(left);
      if (byDate !== 0) return byDate;

      const byRevision = (right.revision ?? 1) - (left.revision ?? 1);
      if (byRevision !== 0) return byRevision;

      const byName = left.name.localeCompare(right.name, "es", {
        sensitivity: "base",
      });
      return byName !== 0 ? byName : left.id.localeCompare(right.id);
    })
    .map((workflow) => ({
      value: workflow.id,
      label: getSaleOrderWorkflowLabel(workflow),
    }));

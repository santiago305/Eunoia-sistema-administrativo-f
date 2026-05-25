import type { SourceSearchRule } from "./sourceSearch";

export type SourceListItem = {
  id: string;
  name: string;
  detail?: string | null;
  isActive: boolean;
};

export type SourceDetail = SourceListItem & {
  createdAt: string;
  updatedAt: string;
};

export type CreateSourceBody = {
  name: string;
  detail?: string;
  isActive: boolean;
};

export type UpdateSourceBody = {
  name?: string;
  detail?: string;
};

export type SourcesListQuery = {
  q?: string;
  page?: number;
  limit?: number;
  isActive?: "true" | "false";
  filters?: SourceSearchRule[] | string;
};


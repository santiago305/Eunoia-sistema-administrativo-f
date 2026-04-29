import axiosInstance from "@/shared/common/utils/axios";
import { API_DOCUMENT_SERIES_GROUP } from "@/shared/services/APIs";

export type DocumentSeries = {
  id: string;
  code: string;
  separator?: string | null;
  padding?: number | string | null;
  nextNumber?: number | string | null;
  warehouseId?: string;
  docType?: string;
  isActive?: boolean;
};

export type DocumentSeriesQuery = {
  warehouseId: string;
  docType: string;
  isActive?: boolean;
};

type DocumentSeriesListResponse = {
  items?: DocumentSeries[];
};

export const listDocumentSeries = async (
  params: DocumentSeriesQuery,
): Promise<DocumentSeries[]> => {
  const response = await axiosInstance.get<DocumentSeriesListResponse | DocumentSeries[] | DocumentSeries>(
    API_DOCUMENT_SERIES_GROUP.list,
    { params },
  );

  const payload = response.data;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "items" in payload &&
    Array.isArray((payload as DocumentSeriesListResponse).items)
  ) {
    return (payload as DocumentSeriesListResponse).items ?? [];
  }

  return payload ? [payload as DocumentSeries] : [];
};

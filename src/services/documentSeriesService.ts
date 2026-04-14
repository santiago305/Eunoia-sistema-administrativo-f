import axiosInstance from "@/common/utils/axios";
import { API_DOCUMENT_SERIES_GROUP } from "@/services/APIs";
import type { DocumentSeries, DocumentSeriesQuery } from "@/pages/stock/types/documentSeries";

export const listDocumentSeries = async (params: DocumentSeriesQuery): Promise<DocumentSeries> => {
  const response = await axiosInstance.get(API_DOCUMENT_SERIES_GROUP.list, { params });
  return response.data?.items ?? response.data ?? [];
};

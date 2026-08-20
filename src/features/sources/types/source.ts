export type Source = {
  id: string;
  name: string;
  detail: string | null;
  isActive: boolean;
};

export type SourceForm = {
  name: string;
  detail: string;
  isActive: boolean;
};

export type SourceRecognitionCode = {
  id: string;
  sourceId: string;
  code: string;
  description: string | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SourceRecognitionCodesResponse = {
  items: SourceRecognitionCode[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type SaveSourceRecognitionCodeInput = {
  code: string;
  description?: string | null;
  isActive?: boolean;
  replaceDeleted?: boolean;
};


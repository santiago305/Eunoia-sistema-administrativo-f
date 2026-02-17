import axiosInstance from "@/common/utils/axios";
import { API_WAREHOUSES_GROUP } from "@/services/APIs";
import type {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  UpdateWarehouseActiveDto,
  ListWarehousesQuery,
  WarehouseListResponse,
  Warehouse,
  WarehouseLocationsResponse,
} from "@/types/warehouse";

export const createWarehouse = async (payload: CreateWarehouseDto): Promise<Warehouse> => {
  const response = await axiosInstance.post(API_WAREHOUSES_GROUP.create, payload);
  return response.data;
};

export const updateWarehouse = async (id: string, payload: UpdateWarehouseDto): Promise<Warehouse> => {
  const response = await axiosInstance.patch(API_WAREHOUSES_GROUP.update(id), payload);
  return response.data;
};

export const updateWarehouseActive = async (
  id: string,
  payload: UpdateWarehouseActiveDto
): Promise<{ ok: boolean }> => {
  const response = await axiosInstance.patch(API_WAREHOUSES_GROUP.updateActive(id), payload);
  return response.data;
};

export const listWarehouses = async (params: ListWarehousesQuery): Promise<WarehouseListResponse> => {
  const response = await axiosInstance.get(API_WAREHOUSES_GROUP.list, { params });
  return response.data;
};

export const getWarehouseById = async (id: string): Promise<Warehouse> => {
  const response = await axiosInstance.get(API_WAREHOUSES_GROUP.getById(id));
  return response.data;
};

export const getLocationsById = async (id: string): Promise<WarehouseLocationsResponse> => {
  const response = await axiosInstance.get(API_WAREHOUSES_GROUP.getWithLocations(id));
  return response.data;
};

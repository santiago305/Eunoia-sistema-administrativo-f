import axiosInstance from "@/common/utils/axios";
import { API_INVENTORY_GROUP } from "@/services/APIs";
import type {
  AvailabilityQuery,
  AvailabilityResponse,
  GetStockQuery,
  GetStockResponse,
  InventoryListResponse,
  ListInventoryQuery,
} from "@/pages/catalog/types/inventory";

export const getStock = async (params: GetStockQuery): Promise<GetStockResponse> => {
  const response = await axiosInstance.get(
    API_INVENTORY_GROUP.getStockQuery({
      warehouseId: params.warehouseId,
      itemId: params.itemId,
      stockItemId: params.stockItemId,
      locationId: params.locationId,
    })
  );
  return response.data;
};

export const listInventory = async (params: ListInventoryQuery): Promise<InventoryListResponse> => {
  const response = await axiosInstance.get(API_INVENTORY_GROUP.list, { params });
  return response.data;
};

export const getAvailability = async (params: AvailabilityQuery): Promise<AvailabilityResponse> => {
  const response = await axiosInstance.get(API_INVENTORY_GROUP.availability, { params });
  return response.data;
};

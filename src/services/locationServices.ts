import axiosInstance from "@/common/utils/axios";
import { API_LOCATIONS_GROUP } from "@/services/APIs";
import type {
  CreateLocationDto,
  UpdateLocationDto,
  UpdateLocationActiveDto,
  ListLocationsQuery,
  LocationsListResponse,
  Location,
} from "@/types/location";

export const createLocation = async (payload: CreateLocationDto): Promise<Location> => {
  const response = await axiosInstance.post(API_LOCATIONS_GROUP.create, payload);
  return response.data;
};

export const updateLocation = async (id: string, payload: UpdateLocationDto): Promise<Location> => {
  const response = await axiosInstance.patch(API_LOCATIONS_GROUP.update(id), payload);
  return response.data;
};

export const updateLocationActive = async (
  id: string,
  payload: UpdateLocationActiveDto
): Promise<{ ok: boolean }> => {
  const response = await axiosInstance.patch(API_LOCATIONS_GROUP.updateActive(id), payload);
  return response.data;
};

export const listLocations = async (params: ListLocationsQuery): Promise<LocationsListResponse> => {
  const response = await axiosInstance.get(API_LOCATIONS_GROUP.list, { params });
  return response.data;
};

export const getLocationById = async (id: string): Promise<Location> => {
  const response = await axiosInstance.get(API_LOCATIONS_GROUP.byId(id));
  return response.data;
};
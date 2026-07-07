import type {
  SaveSaleOrderWithClientDto,
  SaveSaleOrderWithClientFiles,
} from "../types/saleOrder";

type BuildUnifiedRequestInput = SaveSaleOrderWithClientFiles & {
  data: SaveSaleOrderWithClientDto;
};

export function buildSaleOrderUnifiedRequest({
  data,
  shippingPhoto,
  paymentPhotos,
}: BuildUnifiedRequestInput): SaveSaleOrderWithClientDto | FormData {
  const entries =
    paymentPhotos instanceof Map
      ? [...paymentPhotos.entries()]
      : Object.entries(paymentPhotos ?? {});

  if (!shippingPhoto && entries.length === 0) return data;

  const formData = new FormData();
  formData.append("data", JSON.stringify(data));
  if (shippingPhoto) formData.append("shippingPhoto", shippingPhoto);
  for (const [clientKey, file] of entries) {
    formData.append(`paymentPhotos[${clientKey}]`, file);
  }
  return formData;
}

import { ImportField } from "@/shared/components/importer";
import { SaleOrderJsonImportRow } from "./saleOrder";

export const normalizePeruvianMobile = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  const withoutCountryCode = digits.startsWith("0051")
    ? digits.slice(4)
    : digits.startsWith("51")
      ? digits.slice(2)
      : digits;

  return /^9\d{8}$/.test(withoutCountryCode)
    ? withoutCountryCode
    : String(value ?? "").trim();
};

export const saleOrderImportFields: ImportField[] = [
  { 
    key: "workflowName", 
    label: "Tipo",
    aliases: ["Etiqueta","etiqueta", "flujo", "Flujo"] },
  { 
    key: "orderDate", 
    label: "Fecha de agenda", 
    type: "date", 
    aliases: ["Día de creación", "día de creación", "Dia de creacion", "dia de creacion",
      "Fecha de agenda", "fecha de agenda"
    ] },
  { 
    key: "deliveryDate", 
    label: "Fecha de entrega", 
    type: "date", 
    aliases: ["fecha de entrega esperada", "Fecha de entrega esperada", "Fecha de entrega", 
      "fecha de entrega"
     ] },
  { 
    key: "departmentName", 
    label: "Departamento", 
    aliases: ["departamento", "Departmento", "Provincia/Ciudad", "provincia/ciudad"] },
  { 
    key: "provinceName", 
    label: "Provincia", 
    aliases: ["provincia", "Provincia", "Distrito", "distrito"] },
  { 
    key: "districtName", 
    label: "-Distrito", 
    aliases: ["-Distrito", "-districto", "Comuna/Pueblo", "comuna/pueblo"] },
  { 
    key: "recipientName", 
    label: "Destinatario", 
    required: true,
    aliases: ["destinatario", "Destinatario", "Nombre del destinario", 
      "nombre del destinatario"] },
  { 
    key: "address", 
    label: "Dirección detallada", 
    aliases: ["dirección detallada", "direccion detallada",
       "Dirección detallada", "Direccion detallada"] },
  { 
    key: "deliveryNote", 
    label: "DNI/Referencia", 
    aliases: ["DNI/Referencia", "dni/referencia", "Nota de envío", "nota de envío",
      "Nota de envio", "nota de envio"
    ] },
  { 
    key: "phone", 
    label: "Telefono", 
    required: true,
    transform: normalizePeruvianMobile,
    validate: (value) =>
      /^9\d{8}$/.test(String(value ?? ""))
        ? null
        : "El teléfono debe tener 9 dígitos y comenzar con 9.",
    aliases: ["telefono", "teléfono","Telefono","Teléfono",
      "Número de teléfono", "número de teléfono", "Numero de telefono", "numero de telefono"] },
  { 
    key: "couponCode", 
    label: "Pack", 
    aliases: ["Pack", "pack", "Código promocional", "código promocional",
      "Codigo promocional", "codigo promocional"
    ] },
  { 
    key: "productCodes", 
    label: "Códigos de producto", 
    aliases: ["códigos de producto", "Códigos de producto", 
      "codigos de producto", "Codigos de producto", "Incluye códigos de producto", 
      "incluye códigos de producto","Incluye codigos de producto", 
      "incluye codigos de producto" ] },
  { 
    key: "total", 
    label: "Importe a pagar", 
    type: "number",
    required: true,
    validate: (value) =>
      Number(value) > 0 ? null : "El importe a pagar debe ser mayor a 0.",
    aliases: [
      "Importe a pagar",
      "importe a pagar",
      "Importe a cobrar",
      "importe a cobrar",
    ] },
  { 
    key: "advance", 
    label: "Total del anticipo", 
    required: true, 
    type: "number", 
    aliases: ["Total del anticipo", "total del anticipo"] },
  { 
    key: "deliveryCost", 
    label: "Tarifa", 
    type: "number", 
    aliases: ["Tarifa", "tarifa"] },
  { 
    key: "internalNote", 
    label: "Nota interna", 
    aliases: ["nota interna", "Nota interna"] },
  { 
    key: "confirmedBy", 
    label: "Confirmado por", 
    readOnly: true,
    aliases: ["confirmado por", "Confirmado por"] },
  {
    key: "adviserResolution",
    label: "Asesor identificado",
    previewOnly: true,
    readOnly: true,
    validate: (_value, row) =>
      row.adviserResolutionStatus === "NOT_FOUND"
        ? "Configura una equivalencia para este nombre antes de importar."
        : null,
  },
];

export const optionalSaleOrderImportFields = new Set<keyof SaleOrderJsonImportRow>([
  "productName",
  "orderDate",
  "deliveryDate",
  "address",
  "deliveryNote",
  "couponCode",
  "quantity",
  "advance",
  "codAmount",
  "internalNote",
  "confirmedBy",
  "workflowName",
]);

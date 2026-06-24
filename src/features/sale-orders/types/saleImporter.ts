import { ImportField } from "@/shared/components/importer";
import { SaleOrderJsonImportRow } from "./saleOrder";

export const saleOrderImportFields: ImportField[] = [
  { 
    key: "workflowName", 
    label: "Flujo", 
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
    required: true, 
    type: "number", 
    aliases: ["Importe a pagar", "importe a pagar"] },
  { 
    key: "advance", 
    label: "Total del anticipo", 
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
    aliases: ["confirmado por", "Confirmado por"] },
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

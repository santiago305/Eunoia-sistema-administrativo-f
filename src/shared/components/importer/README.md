# Excel importer

El importer permite cargar un archivo Excel, seleccionar una hoja, mapear columnas contra campos del sistema, revisar los datos transformados y confirmar solo las filas aceptables.

## Componentes

- `ExcelImportModal`: orquesta el flujo completo y expone `onSubmit(data, file)`.
- `ExcelDropzone`: recibe archivos `.xlsx` y `.xls`.
- `ExcelSheetSelector`: permite seleccionar la hoja del libro.
- `ExcelColumnMapper`: relaciona cada `ImportField` con una columna del Excel usando `FloatingSelect`.
- `ExcelPreviewTable`: muestra filas ya mapeadas, permite marcar/desmarcar registros, editar campos con componentes flotantes y validar en tiempo real.
- `excelImporter.utils.ts`: contiene lectura, normalizacion, automapeo, conversion, edicion y validacion.

## Flujo

1. El usuario sube un archivo Excel.
2. `readWorkbook` lee el archivo con `xlsx`.
3. El usuario selecciona una hoja.
4. `sheetToRows` convierte la hoja en filas crudas.
5. `getExcelHeaders` detecta columnas disponibles.
6. `autoMapColumns` intenta mapear columnas usando `label`, `key` y `aliases`.
7. El usuario ajusta el mapeo en `ExcelColumnMapper`.
8. `applyMapping` genera filas con las claves internas de `fields` y convierte tipos base.
9. En vista previa, todas las filas empiezan marcadas.
10. El usuario puede desmarcar filas para omitirlas, o editar campos directamente.
11. Cada cambio actualiza la fila con `updateMappedRowValue` y se vuelve a ejecutar `validateRows`.
12. `Confirmar importacion` solo se habilita si hay al menos una fila marcada y las filas marcadas no tienen errores.

## Definicion de campos

Cada campo se describe con `ImportField`:

```ts
type ImportField = {
  key: string;
  label: string;
  required?: boolean;
  type?: "string" | "number" | "date" | "boolean";
  aliases?: string[];
  validate?: (value: unknown, row: Record<string, unknown>) => string | null;
  transform?: (value: unknown) => unknown;
};
```

- `key`: nombre final que recibira `onSubmit`.
- `label`: texto visible para mapeo y preview.
- `required`: valida que el campo no este vacio.
- `type`: controla conversion y editor de preview.
- `aliases`: nombres alternativos para automapear columnas.
- `validate`: validacion propia por campo; debe retornar un mensaje o `null`.
- `transform`: ajuste final del valor despues de convertir el tipo.

## Vista previa editable

La preview trabaja sobre una copia editable de las filas mapeadas. Esto evita mutar las filas crudas del Excel y permite corregir datos antes de importar.

- El checkbox de cada fila decide si el registro se importa.
- Las filas desmarcadas quedan visibles, atenuadas y no bloquean la confirmacion.
- Los errores solo se calculan para filas marcadas.
- Los campos usan componentes compartidos:
  - `FloatingInput` para texto, numero y fecha.
  - `FloatingSelect` para booleanos.
  - `Checkbox` para seleccionar filas.

## Validacion

`validateRows(rows, fields, selectedRowIndexes)` revisa:

- requeridos vacios,
- numeros invalidos,
- validaciones custom definidas en `field.validate`.

Cuando se pasa `selectedRowIndexes`, solo se validan esas filas. Si una fila con errores se desmarca, deja de bloquear el submit.

## Ejemplo de implementacion

```tsx
import { useState } from "react";
import { ExcelImportModal, type ImportField } from "@/shared/components/importer";

type ClientImportRow = {
  documentNumber: string;
  name: string;
  creditLimit: number | "";
  active: boolean | "";
};

const fields: ImportField[] = [
  {
    key: "documentNumber",
    label: "Documento",
    required: true,
    aliases: ["DNI", "RUC", "Numero de documento"],
  },
  {
    key: "name",
    label: "Cliente",
    required: true,
    aliases: ["Nombre", "Razon social"],
  },
  {
    key: "creditLimit",
    label: "Linea de credito",
    type: "number",
    validate: (value) => {
      if (value === "") return null;
      return typeof value === "number" && value >= 0 ? null : "La linea de credito debe ser mayor o igual a 0.";
    },
  },
  {
    key: "active",
    label: "Activo",
    type: "boolean",
    aliases: ["Estado", "Habilitado"],
  },
];

export function ClientImportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Importar clientes
      </button>

      <ExcelImportModal<ClientImportRow>
        open={open}
        title="Importar clientes"
        fields={fields}
        maxRows={500}
        onClose={() => setOpen(false)}
        onSubmit={async (rows, file) => {
          console.log(file.name, rows);
          await saveClients(rows);
        }}
      />
    </>
  );
}
```

`onSubmit` recibe solo las filas marcadas y validas, ya transformadas a las claves internas definidas en `fields`.

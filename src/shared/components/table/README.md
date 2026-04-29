# DataTable

## Importacion basica

```tsx
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
```

## Uso basico

Para usar la tabla necesitas 3 cosas:

- los datos
- las columnas
- un `tableId` unico

Ejemplo:

```tsx
type UserRow = {
  id: string;
  name: string;
  email: string;
};

const columns: DataTableColumn<UserRow>[] = [
  { id: "name", header: "Nombre", accessorKey: "name" },
  { id: "email", header: "Correo", accessorKey: "email" },
];

const data: UserRow[] = [
  { id: "1", name: "Santiago", email: "santiago@test.com" },
  { id: "2", name: "Carlos", email: "carlos@test.com" },
];

<DataTable
  tableId="users-table"
  data={data}
  columns={columns}
  rowKey="id"
/>;
```

## Como definir columnas

Cada columna se define dentro del arreglo `columns`.

### Columna simple

```tsx
{
  id: "name",
  header: "Nombre",
  accessorKey: "name"
}
```

Esto mostrara el valor de `row.name`.

### Columna personalizada

Cuando no quieres mostrar solo texto simple, usas `cell`.

```tsx
{
  id: "status",
  header: "Estado",
  cell: (row) => (
    <span className="inline-flex rounded-md border px-2 py-1 text-xs">
      {row.status}
    </span>
  )
}
```

Usa `cell` cuando quieras:

- badges
- botones
- iconos
- texto formateado
- fechas formateadas
- contenido combinado

### Clases por columna

Puedes personalizar el encabezado y las celdas con:

- `className`
- `headerClassName`

Ejemplo:

```tsx
const columns: DataTableColumn<UserRow>[] = [
  {
    id: "name",
    header: "Nombre",
    accessorKey: "name",
    className: "font-medium",
    headerClassName: "text-left",
  },
];
```

## Como activar el selector de columnas

Si quieres que el usuario pueda decidir que columnas ver y cuales ocultar, activa:

`selectableColumns`

Ejemplo:

```tsx
<DataTable
  tableId="users-table"
  data={data}
  columns={columns}
  rowKey="id"
  selectableColumns
/>;
```

Cuando esto esta activo, aparecera un boton de `Columnas`.

Desde ahi el usuario podra:

- ocultar columnas
- volver a mostrarlas
- restablecer la configuracion

## Como funciona el guardado automatico de columnas

Cuando activas `selectableColumns`, la tabla guarda automaticamente las columnas visibles en `localStorage`.

No tienes que programar nada adicional.

Solo necesitas que el `tableId` sea unico.

Ejemplo:

```tsx
<DataTable
  tableId="users-table"
  data={data}
  columns={columns}
  selectableColumns
/>;
```

La configuracion visible del usuario se guarda automaticamente usando ese `tableId`.

## Importante: `tableId` debe ser unico

Cada tabla debe tener un `tableId` diferente.

Correcto:

```tsx
tableId="users-table"
tableId="companies-table"
tableId="audit-log-table"
```

Incorrecto:

```tsx
tableId="table"
```

Si reutilizas el mismo `tableId` en varias tablas, compartiran la misma configuracion guardada y eso causara problemas.

## Como hacer que una columna no se pueda ocultar

Si una columna debe estar siempre visible, agrega:

`hideable: false`

Ejemplo:

```tsx
const columns: DataTableColumn<UserRow>[] = [
  {
    id: "name",
    header: "Nombre",
    accessorKey: "name",
    hideable: false,
  },
  {
    id: "email",
    header: "Correo",
    accessorKey: "email",
  },
];
```

En este caso:

- `name` no se puede ocultar
- `email` si se puede ocultar

## Como ocultar una columna por defecto

Si quieres que una columna no aparezca al inicio, pero si se pueda activar luego desde el selector, usa:

`visible: false`

Ejemplo:

```tsx
const columns: DataTableColumn<UserRow>[] = [
  {
    id: "name",
    header: "Nombre",
    accessorKey: "name",
  },
  {
    id: "email",
    header: "Correo",
    accessorKey: "email",
    visible: false,
  },
];
```

En este caso:

- la columna `email` no se mostrara inicialmente
- pero el usuario podra activarla desde el selector de columnas

## Como usar paginacion

La tabla soporta paginacion mediante estas props:

```tsx
pagination={{ page, limit, total }}
onPageChange={setPage}
```

Ejemplo:

```tsx
<DataTable
  tableId="users-table"
  data={rows}
  columns={columns}
  rowKey="id"
  pagination={{ page, limit, total }}
  onPageChange={setPage}
/>;
```

## Cuando aparece la paginacion

La paginacion solo aparece cuando realmente hay mas registros que el limite.

Ejemplos:

- si `total = 9` y `limit = 10` -> no aparece
- si `total = 10` y `limit = 10` -> no aparece
- si `total = 11` y `limit = 10` -> si aparece

No necesitas hacer nada extra. Eso ya lo controla el componente.

## Como usarla con paginacion backend

Si tu API ya devuelve datos paginados, solo pasas esos valores.

Ejemplo:

```tsx
const [page, setPage] = useState(1);
const limit = 10;
const [total, setTotal] = useState(0);
const [rows, setRows] = useState<UserRow[]>([]);

useEffect(() => {
  const fetchData = async () => {
    const response = await fetch(`/api/users?page=${page}&limit=${limit}`);
    const json = await response.json();

    setRows(json.data ?? []);
    setTotal(json.total ?? 0);
  };

  fetchData();
}, [page]);

<DataTable
  tableId="users-table"
  data={rows}
  columns={columns}
  rowKey="id"
  pagination={{ page, limit, total }}
  onPageChange={setPage}
/>;
```

## Como usarla con paginacion frontend

Si tienes todos los datos cargados y solo quieres dividirlos por paginas en frontend:

```tsx
const [page, setPage] = useState(1);
const limit = 10;
const total = allData.length;

const paginatedData = useMemo(() => {
  const start = (page - 1) * limit;
  const end = start + limit;
  return allData.slice(start, end);
}, [page, allData]);

<DataTable
  tableId="products-table"
  data={paginatedData}
  columns={columns}
  rowKey="id"
  pagination={{ page, limit, total }}
  onPageChange={setPage}
/>;
```

## Como mostrar estado de carga

Usa la prop `loading`.

```tsx
<DataTable
  tableId="users-table"
  data={rows}
  columns={columns}
  rowKey="id"
  loading={loading}
/>;
```

Cuando `loading` es `true`, se mostraran filas skeleton.

## Como mostrar mensaje cuando no hay datos

Si `data` esta vacio, la tabla muestra un mensaje por defecto.

Tambien puedes personalizarlo con `emptyMessage`.

```tsx
<DataTable
  tableId="users-table"
  data={[]}
  columns={columns}
  rowKey="id"
  emptyMessage="No se encontraron usuarios."
/>;
```

## Como usar `rowKey`

`rowKey` sirve para identificar cada fila de forma estable.

Lo recomendable es siempre usarlo.

Ejemplo simple:

```tsx
rowKey="id"
```

Tambien puede ser funcion:

```tsx
rowKey={(row) => `${row.type}-${row.id}`}
```

## Como activar filas alternadas

Si quieres el efecto de filas intercaladas, usa:

`striped`

Ejemplo:

```tsx
<DataTable
  tableId="users-table"
  data={data}
  columns={columns}
  rowKey="id"
  striped
/>;
```

## Como desactivar hover de fila

Si no quieres que cambie visualmente al pasar el mouse:

`hoverable={false}`

Ejemplo:

```tsx
<DataTable
  tableId="users-table"
  data={data}
  columns={columns}
  rowKey="id"
  hoverable={false}
/>;
```

## Como desactivar animaciones

Si no quieres animacion de entrada en las filas:

`animated={false}`

Ejemplo:

```tsx
<DataTable
  tableId="users-table"
  data={data}
  columns={columns}
  rowKey="id"
  animated={false}
/>;
```

## Ejemplo completo de uso real

```tsx
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";

type ThreatRow = {
  ip: string;
  level: "critical" | "high" | "medium";
  date: string;
  reason: string;
  type: "Permanente" | "Temporal" | "Manual";
};

const data: ThreatRow[] = [
  {
    ip: "203.0.113.42",
    level: "critical",
    date: "20 mar 2026, 14:32",
    reason: "SQL Injection",
    type: "Permanente",
  },
  {
    ip: "198.51.100.88",
    level: "high",
    date: "19 mar 2026, 09:15",
    reason: "Brute Force",
    type: "Temporal",
  },
];

function levelClasses(level: ThreatRow["level"]) {
  switch (level) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-600";
    case "high":
      return "border-amber-200 bg-amber-50 text-amber-600";
    case "medium":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
    default:
      return "border-border bg-muted text-foreground";
  }
}

const columns: DataTableColumn<ThreatRow>[] = [
  {
    id: "ip",
    header: "IP",
    accessorKey: "ip",
    className: "font-mono text-sm",
  },
  {
    id: "level",
    header: "Nivel",
    cell: (row) => (
      <span
        className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${levelClasses(row.level)}`}
      >
        {row.level}
      </span>
    ),
  },
  {
    id: "date",
    header: "Fecha",
    accessorKey: "date",
    className: "text-muted-foreground",
  },
  {
    id: "reason",
    header: "Motivo",
    accessorKey: "reason",
  },
  {
    id: "type",
    header: "Tipo",
    accessorKey: "type",
    className: "text-muted-foreground",
  },
];

export function ThreatsTableDemo() {
  return (
    <DataTable
      tableId="threats-table"
      data={data}
      columns={columns}
      selectableColumns
      rowKey="ip"
      emptyMessage="No se encontraron amenazas."
    />
  );
}
```

## Recomendaciones para el equipo

- usar `selectableColumns` solo cuando tenga sentido que el usuario personalice la vista
- usar `hideable: false` en columnas clave que nunca deben desaparecer
- usar `visible: false` para columnas secundarias que no quieras mostrar al inicio
- siempre usar un `tableId` unico
- siempre usar `rowKey`
- usar `cell` cuando el contenido necesite formato visual o composicion personalizada

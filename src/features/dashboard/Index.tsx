import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft } from "lucide-react";

import type {
  DashboardSaleOrdersUbigeoGroup,
  DashboardSaleOrdersUbigeoResponse,
  DashboardUbigeoLevel,
} from "./types";

import {
  getDashboardSaleOrdersByDepartment,
  getDashboardSaleOrdersByDistrict,
  getDashboardSaleOrdersByProvince,
} from "@/shared/services/dashboardService";

import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { FloatingMonthPicker } from "@/shared/components/components/date-picker/FloatingMonthPicker";

type Selection = {
  departmentId?: string;
  departmentLabel?: string;
  provinceId?: string;
  provinceLabel?: string;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload?: DashboardSaleOrdersUbigeoGroup;
  }>;
};

const LEVEL_LABEL: Record<DashboardUbigeoLevel, string> = {
  department: "Departamentos",
  province: "Provincias",
  district: "Distritos",
};

const CHART_COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#8b5cf6",
  "#f59e0b",
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(Number(value) || 0);
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function ChartTooltip({
  active,
  payload,
}: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const group = payload[0]?.payload;

  if (!group) {
    return null;
  }

  return (
    <div className="min-w-[160px] rounded-md border border-zinc-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-2 text-xs font-semibold text-zinc-900">
        {group.label}
      </p>

      <div className="flex items-center justify-between gap-5 text-xs">
        <span className="text-zinc-500">
          Total
        </span>

        <span className="font-semibold tabular-nums text-zinc-950">
          {formatMoney(group.total)}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [month, setMonth] = useState("");
  const [includeCancelled, setIncludeCancelled] =
    useState(false);

  const [level, setLevel] =
    useState<DashboardUbigeoLevel>("department");

  const [selection, setSelection] =
    useState<Selection>({});

  const [data, setData] =
    useState<DashboardSaleOrdersUbigeoResponse | null>(
      null,
    );

  const [loading, setLoading] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const params = useMemo(
    () => ({
      month: month || undefined,
      cancelBool: includeCancelled,
    }),
    [includeCancelled, month],
  );

  const loadCurrentLevel = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response =
        level === "department"
          ? await getDashboardSaleOrdersByDepartment(
              params,
            )
          : level === "province" &&
              selection.departmentId
            ? await getDashboardSaleOrdersByProvince(
                selection.departmentId,
                params,
              )
            : level === "district" &&
                selection.provinceId
              ? await getDashboardSaleOrdersByDistrict(
                  selection.provinceId,
                  params,
                )
              : await getDashboardSaleOrdersByDepartment(
                  params,
                );

      setData(response);
    } catch {
      setError(
        "No se pudieron cargar las métricas del dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    level,
    params,
    selection.departmentId,
    selection.provinceId,
  ]);

  useEffect(() => {
    void loadCurrentLevel();
  }, [loadCurrentLevel]);

  const handleGroupClick = (
    group: DashboardSaleOrdersUbigeoGroup,
  ) => {
    if (!group.id) {
      return;
    }

    if (level === "department") {
      setSelection({
        departmentId: group.id,
        departmentLabel: group.label,
      });

      setLevel("province");
      return;
    }

    if (level === "province") {
      setSelection((current) => ({
        ...current,
        provinceId: group.id,
        provinceLabel: group.label,
      }));

      setLevel("district");
    }
  };

  const goToDepartments = () => {
    setSelection({});
    setLevel("department");
  };

  const goToProvinces = () => {
    if (!selection.departmentId) {
      return;
    }

    setSelection((current) => ({
      departmentId: current.departmentId,
      departmentLabel: current.departmentLabel,
    }));

    setLevel("province");
  };

  const goBack = () => {
    if (level === "district") {
      goToProvinces();
      return;
    }

    if (level === "province") {
      goToDepartments();
    }
  };

  const totals = data?.totals;

  return (
    <main className="scroll-area min-h-full px-4 py-5 sm:px-6 lg:px-8">
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-5 lg:grid-cols-4">
        {error ? (
          <div className="rounded-sm border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 lg:col-span-3">
            {error}
          </div>
        ) : null}

        <section
          className="min-w-0 rounded-lg p-4 shadow-inner lg:col-span-2"
          role="region"
          aria-labelledby="dashboard-ubigeo-chart-title"
        >
          <div className="min-w-0">
            <div className="flex flex-col gap-4">
              <div className="flex min-w-0 items-start gap-2">
                {level !== "department" ? (
                  <SystemButton
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={goBack}
                    aria-label={
                      level === "district"
                        ? "Volver a provincias"
                        : "Volver a departamentos"
                    }
                    className="h-8 w-8 shrink-0 rounded-sm text-zinc-600"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </SystemButton>
                ) : null}

                <div className="min-w-0">
                  <h2
                    id="dashboard-ubigeo-chart-title"
                    className="text-sm font-semibold text-zinc-900"
                  >
                    Distribución por{" "}
                    {LEVEL_LABEL[
                      level
                    ].toLowerCase()}
                  </h2>
                </div>
              </div>

              <div className="grid w-full grid-cols-2 gap-2">
                <FloatingMonthPicker
                  label="Mes"
                  name="dashboard-month"
                  value={month}
                  max={getCurrentMonth()}
                  onChange={setMonth}
                  placeholder="Todos"
                  containerClassName="min-w-0"
                />

                <FloatingSelect
                  label="Incluir cancelados"
                  name="dashboard-include-cancelled"
                  value={
                    includeCancelled ? "yes" : "no"
                  }
                  options={[
                    {
                      value: "no",
                      label: "No",
                    },
                    {
                      value: "yes",
                      label: "Sí",
                    },
                  ]}
                  onChange={(value) =>
                    setIncludeCancelled(
                      value === "yes",
                    )
                  }
                  containerClassName="min-w-0"
                />
              </div>
            </div>

            {loading ? (
              <span className="mt-2 block text-xs text-zinc-400">
                Actualizando...
              </span>
            ) : null}

            {loading && !data ? (
              <div className="grid h-[320px] place-items-center text-sm text-zinc-500">
                Cargando métricas...
              </div>
            ) : data && data.groups.length > 0 ? (
              <div className="mt-0 min-w-0">
                <div className="pt-2">
                  {totals ? (
                  <ChartSummaryLegend
                    orders={totals.orders}
                    total={totals.total}
                  />
                ) : null}
                </div>
                <div className="relative h-[380px] min-w-0">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={data.groups}
                      margin={{
                        top: 28,
                        right: 8,
                        left: -24,
                        bottom: 48,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e4e4e7"
                      />

                      <XAxis
                        dataKey="label"
                        tick={{
                          fontSize: 9,
                        }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                        height={65}
                      />

                      <YAxis
                        allowDecimals={false}
                        tick={{
                          fontSize: 9,
                        }}
                      />

                      <Tooltip
                        content={<ChartTooltip />}
                        cursor={{
                          fill: "#f4f4f5",
                          opacity: 0.6,
                        }}
                      />

                      <Bar
                        dataKey="orders"
                        name="Pedidos"
                        radius={[6, 6, 0, 0]}
                        cursor={
                          level === "district"
                            ? "default"
                            : "pointer"
                        }
                      >
                        {data.groups.map(
                          (group, index) => (
                            <Cell
                              key={
                                group.id ??
                                `${group.label}-${index}`
                              }
                              fill={
                                CHART_COLORS[
                                  index %
                                    CHART_COLORS.length
                                ]
                              }
                              onClick={() => {
                                if (
                                  level !==
                                    "district" &&
                                  group.id
                                ) {
                                  handleGroupClick(
                                    group,
                                  );
                                }
                              }}
                            />
                          ),
                        )}

                        <LabelList
                          dataKey="orders"
                          position="top"
                          formatter={(
                            value: unknown,
                          ) =>
                            String(
                              Number(value) || 0,
                            )
                          }
                          style={{
                            fill: "#3f3f46",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {level !== "district"
                    ? data.groups
                        .filter(
                          (group) => group.id,
                        )
                        .map(
                          (group, index) => (
                            <SystemButton
                              key={
                                group.id ??
                                `button-${group.label}-${index}`
                              }
                              type="button"
                              variant="ghost"
                              size="custom"
                              onClick={() =>
                                handleGroupClick(
                                  group,
                                )
                              }
                              aria-label={`Ver ${
                                level ===
                                "department"
                                  ? "provincias"
                                  : "distritos"
                              } de ${group.label}`}
                              className="sr-only"
                            >
                              {group.label}
                            </SystemButton>
                          ),
                        )
                    : null}

                  <ul className="sr-only">
                    {data.groups.map(
                      (group, index) => (
                        <li
                          key={
                            group.id ??
                            `summary-${group.label}-${index}`
                          }
                        >
                          {group.label}:{" "}
                          {group.orders} pedidos,
                          total{" "}
                          {formatMoney(
                            group.total,
                          )}
                        </li>
                      ),
                    )}
                  </ul>
                </div>

                
              </div>
            ) : (
              <div className="grid h-[320px] place-items-center text-center text-sm text-zinc-500">
                No hay métricas para los filtros
                actuales.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function ChartSummaryLegend({
  orders,
  total,
}: {
  orders: number;
  total: number;
}) {
  return (
    <ul
      aria-label="Resumen del gráfico"
      className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-600"
    >
      <li className="flex items-center gap-1.5">
        <span>Pedidos:</span>
        <span className="font-semibold tabular-nums text-zinc-950">
          {orders}
        </span>
      </li>

      <li className="flex items-center gap-1.5">
        <span>Total:</span>
        <span className="font-semibold tabular-nums text-zinc-950">
          {formatMoney(total)}
        </span>
      </li>
    </ul>
  );
}

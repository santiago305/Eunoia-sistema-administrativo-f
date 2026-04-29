import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
} from "recharts";

import {
  Product,
  ProductInventoryDetail,
  ProductSkuDetail,
} from "../types/product";
import { getProductInventoryDetail } from "@/shared/services/productService";
import { Modal } from "@/shared/components/modales/Modal";
import { CHART_COLORS } from "@/shared/utils/chartColors";

interface ProductDetailsModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  productType: string;
}

function SkuInventoryChart({ sku }: { sku: ProductSkuDetail }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    return sku.inventory
      .map((item) => ({
        label: item.warehouseName,
        value: Math.max(0, Number(item.onHand) || 0),
      }))
      .filter((item) => item.value > 0);
  }, [sku.inventory]);

  const positiveTotal = useMemo(() => {
    return chartData.reduce((acc, item) => acc + item.value, 0);
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[280px] w-[240px] shrink-0 flex-col items-center justify-center bg-zinc-50 p-6">
        <p className="text-xs text-zinc-500">Sin stock disponible</p>
      </div>
    );
  }

  return (
    <div className="flex w-[240px] shrink-0 flex-col">
      <div className="mb-2 text-center">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">
          {sku.name}
        </p>
      </div>

      <div className="relative h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              cursor={false}
              wrapperStyle={{ zIndex: 50 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;

                const item = payload[0].payload as {
                  label: string;
                  value: number;
                };

                const percent =
                  positiveTotal > 0 ? (item.value / positiveTotal) * 100 : 0;

                return (
                  <div className="relative z-50 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11px] shadow-xl">
                    <p className="font-semibold text-zinc-900">{item.label}</p>
                    <p className="text-zinc-500">
                      Stock:{" "}
                      <span className="text-zinc-800">{item.value}</span>
                    </p>
                    <p className="text-zinc-500">
                      Porcentaje:{" "}
                      <span className="text-zinc-800">
                        {percent.toFixed(1)}%
                      </span>
                    </p>
                  </div>
                );
              }}
            />

            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              innerRadius={55}
              outerRadius={82}
              paddingAngle={4}
              stroke="#ffffff"
              strokeWidth={3}
              activeIndex={activeIndex ?? undefined}
              activeShape={(props: any) => (
                <g>
                  <Sector
                    cx={props.cx}
                    cy={props.cy}
                    innerRadius={props.innerRadius}
                    outerRadius={props.outerRadius + 3}
                    startAngle={props.startAngle}
                    endAngle={props.endAngle}
                    fill={props.fill}
                  />
                </g>
              )}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[9px] font-medium uppercase tracking-widest text-zinc-400">
              Total
            </p>
            <p className="text-xl font-bold text-zinc-950">{sku.total}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductDetailsModal({
  open,
  onClose,
  product,
  productType,
}: ProductDetailsModalProps) {
  const [detail, setDetail] = useState<ProductInventoryDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && product?.id) {
      setLoading(true);

      getProductInventoryDetail(product.id, productType)
        .then(setDetail)
        .finally(() => setLoading(false));
    } else if (!open) {
      setDetail(null);
    }
  }, [open, product?.id, productType]);

  if (!product) return null;

  return (
    <Modal
      title={`Detalle de Inventario: ${product.name}`}
      open={open}
      onClose={onClose}
      className="max-w-[96vw]"
    >
      <div className="max-h-[76vh] overflow-y-auto scrole-stable">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            <span className="ml-3 text-sm text-zinc-500">
              Cargando inventario...
            </span>
          </div>
        ) : detail ? (
          detail.skus.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-4">
              {detail.skus.map((sku) => (
                <SkuInventoryChart key={sku.id} sku={sku} />
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-zinc-500">
              No hay variaciones (SKUs) registradas para este producto.
            </div>
          )
        ) : (
          <div className="py-10 text-center text-sm text-zinc-500">
            No se pudo cargar la información del inventario.
          </div>
        )}
      </div>
    </Modal>
  );
}
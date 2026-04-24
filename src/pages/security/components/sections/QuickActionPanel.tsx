import { memo, useCallback, useMemo, useState } from "react";
import { Ban, FileDown, Play, Search, Shield } from "lucide-react";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { SystemButton } from "@/components/SystemButton";
import { SectionCard } from "../SectionCard";

type RiskLookupResult = {
  ip: string;
  score: number;
  label: string;
  level?: string;
};

type ReasonOption = {
  value: string;
  label: string;
};

type QuickActionPanelProps = {
  onBlacklist: (ip: string, notes?: string) => Promise<void>;
  loading: boolean;
  pollingPaused: boolean;
  onTogglePolling: () => void;
  reasonOptions: ReasonOption[];
  selectedReason: string;
  onReasonChange: (reason: string) => void;
  onExportAudit: () => Promise<void>;
  exportLoading: boolean;
  onLookupIpRisk: (ip: string) => Promise<void>;
  ipRiskLoading: boolean;
  ipRiskResult: RiskLookupResult | null;
};

const ALL_REASON_OPTIONS = [{ value: "__all__", label: "Todos" }];

export const QuickActionPanel = memo(function QuickActionPanel({
  onBlacklist,
  loading,
  pollingPaused,
  onTogglePolling,
  reasonOptions,
  selectedReason,
  onReasonChange,
  onExportAudit,
  exportLoading,
  onLookupIpRisk,
  ipRiskLoading,
  ipRiskResult,
}: QuickActionPanelProps) {
  const [ip, setIp] = useState("");
  const [notes, setNotes] = useState("");
  const [riskIp, setRiskIp] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ip.trim()) return;

    await onBlacklist(ip.trim(), notes.trim() || undefined);
    setIp("");
    setNotes("");
  };

  const handleRiskLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!riskIp.trim()) return;

    await onLookupIpRisk(riskIp.trim());
  };

  const handleExportAudit = useCallback(() => {
    void onExportAudit();
  }, [onExportAudit]);

  const handleReasonSelect = useCallback(
    (value: string) => {
      onReasonChange(value === "__all__" ? "" : value);
    },
    [onReasonChange],
  );

  const riskColorClassName = useMemo(() => {
    const score = ipRiskResult?.score ?? 0;

    if (score > 80) return "bg-destructive/10 text-destructive";
    if (score > 50) return "bg-warning/10 text-warning";
    return "bg-success/10 text-success";
  }, [ipRiskResult?.score]);

  return (
    <SectionCard
      title="Acciones rápidas"
      subtitle="Controles operativos para respuesta y auditoría."
    >
      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
          <div className="w-40">
            <FloatingInput
              label="Dirección IP"
              name="security-block-ip"
              value={ip}
              onChange={(event) => setIp(event.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>

          <div className="w-44">
            <FloatingInput
              label="Motivo"
              name="security-block-reason"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <SystemButton
            type="submit"
            size="custom"
            variant="danger"
            loading={loading}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-xs"
            leftIcon={!loading && <Ban className="h-3 w-3" />}
          >
            Blacklist manual
          </SystemButton>
        </form>

        <div className="flex flex-wrap items-end gap-2">
          <SystemButton
            size="custom"
            variant="outline"
            onClick={handleExportAudit}
            loading={exportLoading}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-xs"
            leftIcon={!exportLoading && <FileDown className="h-3 w-3" />}
          >
            Exportar auditoría
          </SystemButton>

          <SystemButton
            size="custom"
            variant="outline"
            onClick={onTogglePolling}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-xs"
            leftIcon={
              pollingPaused ? (
                <Play className="h-3 w-3" />
              ) : (
                <Shield className="h-3 w-3" />
              )
            }
          >
            {pollingPaused ? "Reanudar polling" : "Pausar polling"}
          </SystemButton>

          <div className="ml-auto flex flex-wrap items-end gap-1.5">
            <div className="w-36">
              <FloatingSelect
                label="Motivo"
                name="security-reason-filter"
                value={selectedReason || "__all__"}
                options={[...ALL_REASON_OPTIONS, ...reasonOptions]}
                onChange={handleReasonSelect}
                className="mt-2 h-8 w-36 text-xs"
                containerClassName="w-36"
              />
            </div>

            <form onSubmit={handleRiskLookup} className="flex items-end gap-1.5">
              <div className="w-32">
                <FloatingInput
                  label="IP de riesgo"
                  name="security-risk-ip"
                  value={riskIp}
                  onChange={(event) => setRiskIp(event.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <SystemButton
                type="submit"
                size="custom"
                loading={ipRiskLoading}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md px-3 text-xs"
                leftIcon={!ipRiskLoading && <Search className="h-3 w-3" />}
              >
                Consultar
              </SystemButton>
            </form>
          </div>
        </div>

        {ipRiskResult ? (
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                IP analizada
              </span>
              <span className="font-semibold text-foreground text-xs">
                {ipRiskResult.ip}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Riesgo
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${riskColorClassName}`}
              >
                {ipRiskResult.label} · {ipRiskResult.score}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
});

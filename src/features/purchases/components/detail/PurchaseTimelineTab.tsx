import { PurchaseTimeline, type PurchaseTimelineEvent } from "@/features/purchases/components/timeline/PurchaseTimeline";

type Props = {
  events: PurchaseTimelineEvent[];
  loading?: boolean;
};

export function PurchaseTimelineTab({ events, loading = false }: Props) {
  return <PurchaseTimeline events={events} loading={loading} />;
}

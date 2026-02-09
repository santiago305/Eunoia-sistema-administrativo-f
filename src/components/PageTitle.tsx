import { Helmet } from "react-helmet-async";

export function PageTitle({ title }: { title: string }) {
  return (
    <Helmet>
      <title>{title} | Eunoia</title>
    </Helmet>
  );
}

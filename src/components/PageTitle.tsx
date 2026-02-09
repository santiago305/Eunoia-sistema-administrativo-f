import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

export function PageTitle({ title }: { title: string }) {
  const location = useLocation();
  const fullTitle = `${title} | Eunoia`;

  useEffect(() => {
    document.title = fullTitle;
  }, [fullTitle, location.pathname]);

  return (
    <Helmet key={location.pathname}>
      <title>{fullTitle}</title>
    </Helmet>
  );
}

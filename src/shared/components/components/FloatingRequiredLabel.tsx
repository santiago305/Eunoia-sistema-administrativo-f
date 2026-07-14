type FloatingRequiredLabelProps = {
  label: string;
  required?: boolean;
};

export function FloatingRequiredLabel({
  label,
  required = false,
}: FloatingRequiredLabelProps) {
  return (
    <>
      {label}
      {required ? (
        <span aria-hidden="true" className="ml-0.5 text-red-600">
          *
        </span>
      ) : null}
    </>
  );
}

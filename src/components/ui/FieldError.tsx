const FieldError = ({ error }: { error?: string }) =>
  error ? <p className="text-sm text-red-500">{error}</p> : null;

export default FieldError


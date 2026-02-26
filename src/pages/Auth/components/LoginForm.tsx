import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginCredentials } from "@/types/auth";
import { LoginSchema } from "@/schemas/authSchemas";
import { useAuth } from "@/hooks/useAuth";
import FormField from "@/components/ui/formField";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { RoutesPaths } from "@/router/config/routesPaths";
import { errorResponse, successResponse } from "@/common/utils/response";

function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [submitting, setSubmitting] = useState(false);
  const [lockSeconds, setLockSeconds] = useState<number>(0);
  const navigate = useNavigate();
  const { showFlash, clearFlash } = useFlashMessage();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(LoginSchema),
  });

  const isTemporarilyBlocked = useMemo(() => lockSeconds > 0, [lockSeconds]);

  useEffect(() => {
    if (!isTemporarilyBlocked) return;
    const timer = setInterval(() => {
      setLockSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isTemporarilyBlocked]);

  const formatSeconds = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const hh = String(hours).padStart(2, "0");
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  const humanizeLockTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return "0 minutos";
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.ceil((totalSeconds % 3600) / 60);

    if (days > 0) {
      const hourPart = hours > 0 ? ` y ${hours} hora${hours === 1 ? "" : "s"}` : "";
      return `${days} d${days === 1 ? "ia" : "ias"}${hourPart}`;
    }
    if (hours > 0) {
      return `${hours} hora${hours === 1 ? "" : "s"} y ${minutes} minuto${minutes === 1 ? "" : "s"}`;
    }
    return `${minutes} minuto${minutes === 1 ? "" : "s"}`;
  };

  const onSubmit = async (data: LoginCredentials) => {
    if (isTemporarilyBlocked) {
      showFlash(
        errorResponse(
          `Cuenta bloqueada. Intenta nuevamente en ${humanizeLockTime(lockSeconds)}`
        )
      );
      return;
    }

    clearFlash();
    clearErrors(["email", "password"]);
    setSubmitting(true);
    try {
      const response = await login(data);
      if (response.success) {
        showFlash(successResponse(response.message));
        navigate(RoutesPaths.dashboard, { replace: true });
      } else {
        const retrySeconds = response.data?.retryAfterSeconds ?? 0;
        if (retrySeconds > 0) {
          showFlash(
            errorResponse(
              `Cuenta bloqueada. Intenta nuevamente en ${humanizeLockTime(retrySeconds)}`
            )
          );
          setLockSeconds(retrySeconds);
        } else if (response.data?.status === 423) {
          showFlash(errorResponse("Cuenta bloqueada. Intenta nuevamente en 1 minuto"));
          setLockSeconds(60);
        } else {
          if (response.data?.fieldErrors?.email) {
            setError("email", { type: "server", message: response.data.fieldErrors.email });
          }
          if (response.data?.fieldErrors?.password) {
            setError("password", { type: "server", message: response.data.fieldErrors.password });
          }
          showFlash(errorResponse(response.message));
        }
      }
    } catch {
      showFlash(errorResponse("Credenciales invalidas o error de red"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="mb-5 text-center sm:mb-6">
        <p className="text-[10px] tracking-[0.25em] text-black/60 sm:text-[11px]">ADMINISTRACION</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#21b8a6] sm:text-4xl">EUNOIA</h1>
      </div>

      <div
        className={cn(
          "rounded-2xl border border-black/10 bg-white shadow-[0_12px_28px_rgba(0,0,0,0.08)]",
          "p-5 sm:p-6"
        )}
      >
        <h2 className="text-sm font-semibold text-black sm:text-base">Inicia sesion</h2>
        <p className="mt-1 text-xs text-black/60 sm:text-sm">Ingresa tus credenciales para continuar.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4 sm:mt-6">
          <FormField<LoginCredentials>
            name="email"
            label="Correo electronico"
            placeholder="correo@ejemplo.com"
            register={register}
            error={errors.email?.message}
          />

          <FormField<LoginCredentials>
            name="password"
            label="Contrasena"
            placeholder="********"
            type="password"
            register={register}
            error={errors.password?.message}
          />

          <Button
            type="submit"
            disabled={submitting || isTemporarilyBlocked}
            className={cn(
              "mt-2 w-full rounded-xl text-white cursor-pointer",
              "bg-[#21b8a6] hover:bg-[#19a897]",
              "shadow-sm",
              "focus-visible:ring-2 focus-visible:ring-[#21b8a6] focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-70"
            )}
          >
            {submitting
              ? "Ingresando..."
              : isTemporarilyBlocked
                ? `Espera ${formatSeconds(lockSeconds)}`
                : "Ingresar"}
          </Button>
        </form>
      </div>

      <p className="mt-4 text-center text-[11px] text-black/40 sm:mt-5 sm:text-xs">
        {new Date().getFullYear()} Eunoia
      </p>
    </div>
  );
}

export default LoginForm;

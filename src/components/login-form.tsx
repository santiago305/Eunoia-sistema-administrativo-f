import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginCredentials } from "@/types/auth";
import { LoginSchema } from "@/schemas/authSchemas";
import { useAuth } from "@/hooks/useAuth";
import FormField from "./ui/formField";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { RoutesPaths } from "@/router/config/routesPaths";
import { errorResponse, successResponse } from "@/common/utils/response";

function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { showFlash, clearFlash } = useFlashMessage();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginCredentials) => {
    clearFlash();
    setSubmitting(true);
    try {
      const response = await login(data);
      if (response.success) {
        showFlash(successResponse(response.message));
        navigate(RoutesPaths.dashboard, { replace: true });
      } else {
        showFlash(errorResponse(response.message));
      }
    } catch {
      showFlash(errorResponse("Credenciales inválidas o error de red"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn("w-full", className)} {...props}>
      {/* Header */}
      <div className="mb-5 text-center sm:mb-6">
        <p className="text-[10px] tracking-[0.25em] text-black/60 sm:text-[11px]">
          ADMINISTRACIÓN
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#21b8a6] sm:text-4xl">
          EUNOIA
        </h1>
      </div>

      {/* Caja */}
      <div
        className={cn(
          "rounded-2xl border border-black/10 bg-white shadow-[0_12px_28px_rgba(0,0,0,0.08)]",
          "p-5 sm:p-6"
        )}
      >
        <h2 className="text-sm font-semibold text-black sm:text-base">
          Inicia sesión
        </h2>
        <p className="mt-1 text-xs text-black/60 sm:text-sm">
          Ingresa tus credenciales para continuar.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4 sm:mt-6">
          <FormField<LoginCredentials>
            name="email"
            label="Correo electrónico"
            placeholder="correo@ejemplo.com"
            register={register}
            error={errors.email?.message}
          />

          <FormField<LoginCredentials>
            name="password"
            label="Contraseña"
            placeholder="••••••••"
            type="password"
            register={register}
            error={errors.password?.message}
          />

          <Button
            type="submit"
            disabled={submitting}
            className={cn(
              "mt-2 w-full rounded-xl text-white cursor-pointer",
              "bg-[#21b8a6] hover:bg-[#19a897]",
              "shadow-sm",
              "focus-visible:ring-2 focus-visible:ring-[#21b8a6] focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-70"
            )}
          >
            {submitting ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </div>

      <p className="mt-4 text-center text-[11px] text-black/40 sm:mt-5 sm:text-xs">
        © {new Date().getFullYear()} Eunoia
      </p>
    </div>
  );
}

export default LoginForm;

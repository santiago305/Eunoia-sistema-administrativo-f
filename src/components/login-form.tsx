import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { register, handleSubmit, formState: { errors } } = useForm<LoginCredentials>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginCredentials) => {
    clearFlash();
    setSubmitting(true);
    try {
      const response = await login(data);
      if (response.success) {
        showFlash(successResponse(response.message));
        navigate(RoutesPaths.home, { replace: true });
      } else {
        showFlash(errorResponse(response.message));
      }
    } catch {
      showFlash(errorResponse("Credenciales invalidas o error de red"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl">Inicia sesion en tu cuenta</CardTitle>
          <CardDescription>Ingrese su correo electronico para iniciar sesion</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-6">
              <FormField<LoginCredentials>
                name="email"
                label="Correo Electronico"
                placeholder="m@e123.com"
                register={register}
                error={errors.email?.message}
              />

              <FormField<LoginCredentials>
                name="password"
                label="Contrasena"
                placeholder="m@e123.com"
                type="password"
                register={register}
                error={errors.password?.message}
              />

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Cargando..." : "Login"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginForm;

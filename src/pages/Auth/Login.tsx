import LoginForm from "@/components/login-form";

export default function Page() {
  return (
    <div className="min-h-svh w-full bg-white">
      {/* Fondo sutil, sin exagerar */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#7fe3d6]/15 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute -bottom-56 right-[-120px] h-[420px] w-[420px] rounded-full bg-[#21b8a6]/10 blur-3xl sm:h-[520px] sm:w-[520px]" />
      </div>

      {/* Contenido centrado */}
      <div className="relative mx-auto flex min-h-svh max-w-md items-center justify-center px-4 py-10 sm:px-6">
        <LoginForm />
      </div>
    </div>
  );
}

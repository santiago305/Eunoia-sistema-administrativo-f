

//  const avatarSrc = useMemo(() => {
//      const raw = user?.avatarUrl;
//      if (!raw) return Img;

//      // Si ya es absoluta, úsala
//      if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

//      // Normaliza: si viene /assets/ -> /api/assets/
//      const normalized = raw.startsWith("/api/assets/") ? raw : raw.replace("/assets/", "/api/assets/");

//      return `${API_BASE_URL}${normalized}`;
//  }, [user?.avatarUrl]);


const Avatar = () => {
    return (
        <div>
            <div className="pt-4 pl-4  ml-5">
                <p className="text-lg font-semibold text-gray-900">Avatar</p>
                <p className="text-md text-gray-500">Elige una foto profesional para tu perfil</p>
            </div>
            <div className="flex">
                <div className="p-4 ml-5">
                    <label className="group relative">
                        <div className="relative h-50 w-80 border border-black/10 bg-white overflow-hidden">
                            <div
                                className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(33,184,166,0.20),transparent_58%),
                            linear-gradient(to_bottom_right,rgba(0,0,0,0.03),transparent)]"
                            />
                        </div>
                    </label>
                </div>

                <div className="pt-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex-1/12">
                            <p className="mt-1 text-lg text-gray-500">
                                Te recomendamos que utilices una imagen de 98x98 píxeles <br />
                                y 4 MB como máximo. Usa un archivo PNG o GIF (no animado). Asegúrate <br />
                                de que la imagen cumple con estas caracteristicas.
                            </p>
                        </div>
                    </div>
                    <div className="mt-10 px-4 flex gap-2">
                        <button
                            className="inline-flex items-center justify-center rounded-full bg-gray-100 px-6
                         py-3 text-base font-semibold text-black hover:bg-gray-300 transition cursor-pointer"
                        >
                            Quitar
                        </button>
                        <button
                            className="inline-flex items-center justify-center rounded-full bg-gray-100 px-6
                         py-3 text-base font-semibold text-black hover:bg-gray-300 transition cursor-pointer"
                        >
                            Cambiar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Avatar;

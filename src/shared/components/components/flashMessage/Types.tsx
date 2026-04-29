import {
    AiFillCheckCircle,
    AiFillAlert,
    AiOutlineExclamationCircle,
    AiFillInfoCircle,
  } from "react-icons/ai";
  
  export const flashTypes = {
    success: {
      title: "Éxito",
      color: "#16a34a",
      icon: <AiFillCheckCircle className="h-full w-full" />,
    },
    error: {
      title: "Error",
      color: "#c50202",
      icon: <AiFillAlert className="h-full w-full" />,
    },
    warning: {
      title: "Advertencia",
      color: "#eab308",
      icon: <AiOutlineExclamationCircle className="h-full w-full" />,
    },
    info: {
      title: "Información",
      color: "#2563eb",
      icon: <AiFillInfoCircle className="h-full w-full" />,
    },
  } as const;
  
  export type FlashKind = keyof typeof flashTypes;
  


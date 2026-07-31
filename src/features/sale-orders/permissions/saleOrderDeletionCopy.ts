export const buildSaleOrderDeletionCopy = ({ count, canViewDeleted, canRestore }: { count: number; canViewDeleted: boolean; canRestore: boolean }) => {
  const plural = count !== 1;
  const noun = plural ? "Los pedidos serán eliminados." : "El pedido será eliminado.";
  if (canViewDeleted && canRestore) return `${noun} Podrás ${plural ? "verlos y restaurarlos" : "verlo y restaurarlo"} desde Pedidos eliminados.`;
  if (canViewDeleted) return `${noun} Podrás ${plural ? "verlos, pero no podrás restaurarlos" : "verlo, pero no podrás restaurarlo"} desde Pedidos eliminados.`;
  return `${noun} ${plural ? "No podrás recuperarlos" : "No podrás recuperarlo"} una vez eliminado${plural ? "s" : ""}.`;
};

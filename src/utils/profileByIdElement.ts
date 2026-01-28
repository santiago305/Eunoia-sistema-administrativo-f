export  function profileByElementId(id: string) {
    const element = document.getElementById(id);
    if (!element) return null;

    if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement 
    ) {
        element.disabled = false;
        element.focus();
        element.style.color = "black";
    }
    
    return element;
}

export  function inputChangeFocus(id:string){
    const element = document.getElementById(id);
    if (!element) return null;
    if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ) 
        {
        element.style.color = "gray";
        element.disabled = true;
    }
    return element;
}
const obtener = id => document.getElementById(id);
const tiendas = ['Bella Vista','Plaza Nueva','Patio Embajada','Colina Centro','Reboot','Smartbox Kiosco','Plaza Kiosco'];
const pedido = [];
const tienda = obtener('tienda'), linea = obtener('linea'), modelo = obtener('modelo'), color = obtener('color');
function opciones(selector, valores) {
  selector.replaceChildren(...valores.map(valor => new Option(valor, valor)));
}
const proMaxCompatibles = ['iPhone 17 Pro Max', 'iPhone 18 Pro Max'];
function actualizarColores() {
  const inventarios = linea.value === 'Élite' && proMaxCompatibles.includes(modelo.value)
    ? proMaxCompatibles : [modelo.value];
  // catalogo conserva los colores de cada inventario original.
  opciones(color, [...new Set(inventarios.flatMap(origen => catalogo[linea.value][origen] || []))]);
}
function actualizarModelos() {
  opciones(modelo, Object.keys(catalogo[linea.value]).sort((a,b) => a.localeCompare(b,'es',{numeric:true})));
  actualizarColores();
}
function actualizarTiendas() {
  const nombres = [...new Set([...tiendas, ...pedido.map(item => item.tienda)])];
  opciones(tienda, nombres);
  tienda.add(new Option('Tienda nueva…', '__nueva'));
}
function mostrarNueva() {
  const nueva = tienda.value === '__nueva';
  obtener('nuevaFila').hidden = !nueva;
  obtener('nueva').required = nueva;
}
function mostrarPedido() {
  const resumen = obtener('resumen');
  resumen.replaceChildren();
  obtener('acciones').hidden = !pedido.length;
  obtener('texto').hidden = true;
  obtener('nuevo').hidden = !historial.some(p => p.id === idPedido);
  if (!pedido.length) { resumen.textContent = 'Todavía no has agregado covers.'; return; }
  const mensaje = ['MAGIKAL · Pedido de Maribí'];
  let total = 0;
  for (const nombre of new Set(pedido.map(item => item.tienda))) {
    const titulo = document.createElement('h3'), lista = document.createElement('ul');
    const items = pedido.filter(item => item.tienda === nombre);
    const unidades = items.reduce((s,item) => s + item.cantidad, 0);
    titulo.textContent = nombre + ' · ' + unidades + ' uds.';
    resumen.append(titulo, lista);
    mensaje.push('', titulo.textContent);
    for (const item of items) {
      const fila = document.createElement('li'), quitar = document.createElement('button');
      fila.textContent = item.cantidad + ' × ' + [item.linea,item.modelo,item.color].join(' · ');
      mensaje.push(fila.textContent);
      quitar.textContent = 'Quitar';
      quitar.onclick = () => { pedido.splice(pedido.indexOf(item),1); mostrarPedido(); guardar(); };
      fila.append(quitar); lista.append(fila);
    }
    total += unidades;
  }
  const pie = document.createElement('strong');
  pie.textContent = 'Total del pedido · ' + total + ' uds.';
  resumen.append(pie);
  mensaje.push('',pie.textContent,obtener('condicion').textContent);
  obtener('texto').value = mensaje.join('\n');
  obtener('compartir').href = 'https://wa.me/?text=' + encodeURIComponent(obtener('texto').value);
}
obtener('formulario').onsubmit = event => {
  event.preventDefault();
  const campo = obtener('nueva');
  const nombre = tienda.value === '__nueva' ? campo.value.trim() : tienda.value;
  if (!nombre || nombre === '__nueva') { campo.setCustomValidity('Escribe el nombre de la tienda.'); campo.reportValidity(); return; }
  const conocida = [...tienda.options].find(op => op.value.localeCompare(nombre,'es',{sensitivity:'base'}) === 0);
  const destino = conocida?.value || nombre;
  const cantidad = Number(obtener('cantidad').value);
  const item = pedido.find(i => i.tienda === destino && i.linea === linea.value && i.modelo === modelo.value && i.color === color.value);
  if (item) item.cantidad += cantidad;
  else pedido.push({tienda:destino,linea:linea.value,modelo:modelo.value,color:color.value,cantidad});
  actualizarTiendas(); tienda.value = destino; campo.value = ''; mostrarNueva();
  obtener('aviso').textContent = cantidad + ' uds. agregadas a ' + destino + '.';
  obtener('cantidad').value = 1;
  mostrarPedido(); guardar();
};
obtener('nueva').oninput = () => obtener('nueva').setCustomValidity('');
obtener('copiar').onclick = async () => {
  const campo = obtener('texto');
  try { await navigator.clipboard.writeText(campo.value); obtener('copiar').textContent = 'Pedido copiado'; }
  catch { campo.hidden = false; campo.focus(); campo.select(); }
};
linea.onchange = actualizarModelos; modelo.onchange = actualizarColores; tienda.onchange = mostrarNueva;
const clave = 'magikal.pedido.maribi.v1';
const historial = [];
function crearId() {
  return Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-');
}
let idPedido = crearId();
function mostrarHistorial() {
  const contenedor = obtener('historial');
  contenedor.replaceChildren();
  if (!historial.length) contenedor.textContent = 'Todavía no hay pedidos en el historial.';
  for (const entrada of historial.slice().reverse()) {
    const detalle = document.createElement('details');
    const fecha = document.createElement('summary');
    fecha.textContent = new Date(entrada.fecha).toLocaleString('es', {dateStyle:'medium', timeStyle:'short'}) + ' · ' + entrada.unidades + ' uds.';
    const mensaje = document.createElement('p');
    mensaje.style.whiteSpace = 'pre-wrap';
    mensaje.textContent = entrada.mensaje;
    detalle.append(fecha, mensaje);
    contenedor.append(detalle);
  }
}
const campos = ['tienda','nueva','linea','modelo','color','cantidad'];
const avisoGuardado = obtener('guardado');
function guardar() {
  try {
    const formulario = Object.fromEntries(campos.map(id => [id, obtener(id).value]));
    localStorage.setItem(clave, JSON.stringify({pedido, formulario, idPedido, historial}));
    avisoGuardado.textContent = 'Borrador guardado en este navegador.';
    return true;
  } catch {
    avisoGuardado.textContent = 'Este navegador no pudo guardar el borrador. Copia el pedido antes de salir.';
    return false;
  }
}
function restaurar() {
  try {
    const datos = JSON.parse(localStorage.getItem(clave));
    if (!datos) return;
    if (!Array.isArray(datos.pedido) || !datos.formulario) throw new Error();
    for (const item of datos.pedido) {
      if (!item || !['tienda','linea','modelo','color'].every(k => typeof item[k] === 'string') ||
          !Number.isSafeInteger(item.cantidad) || item.cantidad < 1) throw new Error();
    }
    pedido.push(...datos.pedido);
    if (typeof datos.idPedido === 'string') idPedido = datos.idPedido;
    if (Array.isArray(datos.historial)) historial.push(...datos.historial);
    actualizarTiendas();
    for (const id of campos) {
      const campo = obtener(id), valor = datos.formulario[id];
      if (typeof valor !== 'string') continue;
      if (campo.options && !Array.from(campo.options).some(op => op.value === valor)) continue;
      campo.value = valor;
      if (id === 'linea') actualizarModelos();
      if (id === 'modelo') actualizarColores();
    }
    mostrarNueva();
    avisoGuardado.textContent = 'Recuperamos tu borrador. Puedes seguir editándolo.';
  } catch {
    avisoGuardado.textContent = 'No se pudo recuperar el borrador en este navegador.';
  }
}
actualizarTiendas(); opciones(linea,Object.keys(catalogo)); actualizarModelos();
restaurar(); mostrarPedido(); mostrarHistorial();
obtener('formulario').addEventListener('input', guardar);
obtener('formulario').addEventListener('change', guardar);
obtener('compartir').onclick = event => {
  const indice = historial.findIndex(p => p.id === idPedido);
  const anterior = historial[indice];
  const entrada = {id:idPedido, fecha:anterior?.fecha || new Date().toISOString(),
    unidades:pedido.reduce((s,i) => s + i.cantidad,0), mensaje:obtener('texto').value};
  if (anterior) historial[indice] = entrada;
  else historial.push(entrada);
  if (guardar()) {
    mostrarHistorial();
    obtener('nuevo').hidden = false;
    return;
  }
  if (anterior) historial[indice] = anterior;
  else historial.pop();
  event.preventDefault();
  obtener('texto').hidden = false;
  obtener('texto').focus();
  obtener('texto').select();
};
obtener('nuevo').onclick = () => {
  const anterior = historial.find(p => p.id === idPedido);
  if (!anterior) return;
  if (pedido.length && anterior.mensaje !== obtener('texto').value) {
    avisoGuardado.textContent = 'El pedido tiene cambios. Vuelve a compartirlo para guardarlos en el historial antes de iniciar otro.';
    avisoGuardado.scrollIntoView();
    return;
  }
  // Sustituir el borrador solo después de guardar correctamente el historial.
  try {
    localStorage.setItem(clave, JSON.stringify({pedido:[], formulario:{}, idPedido:crearId(), historial}));
  } catch {
    avisoGuardado.textContent = 'No se pudo iniciar otro pedido. Tu pedido actual sigue abierto.';
    return;
  }
  location.reload();
};

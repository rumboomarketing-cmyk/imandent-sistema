// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';

const PRECIOS = {
  Panorámica: 280,
  Lateral: 340,
  'Panorámica y Lateral': 620,
};

const COMISIONES_ENTREGA = {
  Digital: 50,
  Impresa: 40,
};

const FORMULARIO_INICIAL = {
  fecha: '',
  nombre: '',
  telefono: '',
  correo: '',
  estudio: 'Panorámica',
  tipoPago: 'Efectivo',
  estadoPago: 'Pagado',
  clinica: '',
  tipoEntrega: 'Digital',
  observaciones: '',
};

function obtenerSemanaInfo(fecha) {
  if (!fecha) {
    return {
      clave: 'Sin fecha',
      anio: 0,
      semana: 0,
    };
  }

  const d = new Date(fecha + 'T00:00:00');
  const inicioAnio = new Date(d.getFullYear(), 0, 1);
  const dias = Math.floor((d - inicioAnio) / 86400000);
  const semana = Math.ceil((dias + inicioAnio.getDay() + 1) / 7);

  return {
    clave: `${d.getFullYear()} - Semana ${semana}`,
    anio: d.getFullYear(),
    semana,
  };
}

function generarFolio() {
  const ahora = new Date();
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, '0');
  const d = String(ahora.getDate()).padStart(2, '0');
  const h = String(ahora.getHours()).padStart(2, '0');
  const min = String(ahora.getMinutes()).padStart(2, '0');
  const s = String(ahora.getSeconds()).padStart(2, '0');
  return `IMA-${y}${m}${d}-${h}${min}${s}`;
}

function exportarCSV(registros) {
  const encabezados = [
    'Folio',
    'Fecha',
    'Semana',
    'Nombre',
    'Telefono',
    'Correo',
    'Estudio',
    'Precio',
    'Tipo de pago',
    'Estado de pago',
    'Clinica',
    'Tipo de entrega',
    'Comision',
    'Observaciones',
  ];

  const filas = registros.map((r) => [
    r.folio,
    r.fecha,
    r.semanaClave,
    `"${(r.nombre || '').replace(/"/g, '""')}"`,
    r.telefono,
    r.correo,
    r.estudio,
    r.precio,
    r.tipoPago,
    r.estadoPago,
    `"${(r.clinica || '').replace(/"/g, '""')}"`,
    r.tipoEntrega,
    r.comision,
    `"${(r.observaciones || '').replace(/"/g, '""')}"`,
  ]);

  const contenido = [encabezados, ...filas]
    .map((fila) => fila.join(','))
    .join('\n');
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = 'imadent_control_semanal.csv';
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

function fechaHoyTexto() {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  const d = String(hoy.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function App() {
  const [formulario, setFormulario] = useState({
    ...FORMULARIO_INICIAL,
    fecha: fechaHoyTexto(),
  });

  const [busqueda, setBusqueda] = useState('');
  const [filtroClinica, setFiltroClinica] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [verHistorial, setVerHistorial] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  const [registros, setRegistros] = useState(() => {
    try {
      const guardados = localStorage.getItem('imadent_registros');
      return guardados ? JSON.parse(guardados) : [];
    } catch (error) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('imadent_registros', JSON.stringify(registros));
  }, [registros]);

  const semanaActual = useMemo(() => obtenerSemanaInfo(fechaHoyTexto()), []);

  const cambiarCampo = (campo, valor) => {
    setFormulario((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const limpiarFormulario = () => {
    setFormulario({
      ...FORMULARIO_INICIAL,
      fecha: fechaHoyTexto(),
    });
    setEditandoId(null);
  };

  const guardarPaciente = () => {
    if (!formulario.fecha || !formulario.nombre) {
      alert('Completa fecha y nombre.');
      return;
    }

    const semanaInfo = obtenerSemanaInfo(formulario.fecha);
    const precio = PRECIOS[formulario.estudio];
    const comision = COMISIONES_ENTREGA[formulario.tipoEntrega] || 0;

    if (editandoId) {
      setRegistros((prev) =>
        prev.map((r) =>
          r.id === editandoId
            ? {
                ...r,
                fecha: formulario.fecha,
                semanaClave: semanaInfo.clave,
                nombre: formulario.nombre,
                telefono: formulario.telefono,
                correo: formulario.correo,
                estudio: formulario.estudio,
                precio,
                tipoPago: formulario.tipoPago,
                estadoPago: formulario.estadoPago,
                clinica: formulario.clinica.trim(),
                tipoEntrega: formulario.tipoEntrega,
                comision,
                observaciones: formulario.observaciones,
              }
            : r
        )
      );
      limpiarFormulario();
      return;
    }

    const nuevoRegistro = {
      id: Date.now(),
      folio: generarFolio(),
      fecha: formulario.fecha,
      semanaClave: semanaInfo.clave,
      nombre: formulario.nombre,
      telefono: formulario.telefono,
      correo: formulario.correo,
      estudio: formulario.estudio,
      precio,
      tipoPago: formulario.tipoPago,
      estadoPago: formulario.estadoPago,
      clinica: formulario.clinica.trim(),
      tipoEntrega: formulario.tipoEntrega,
      comision,
      observaciones: formulario.observaciones,
    };

    setRegistros((prev) => [nuevoRegistro, ...prev]);
    limpiarFormulario();
  };

  const editarRegistro = (registro) => {
    setFormulario({
      fecha: registro.fecha || '',
      nombre: registro.nombre || '',
      telefono: registro.telefono || '',
      correo: registro.correo || '',
      estudio: registro.estudio || 'Panorámica',
      tipoPago: registro.tipoPago || 'Efectivo',
      estadoPago: registro.estadoPago || 'Pagado',
      clinica: registro.clinica || '',
      tipoEntrega: registro.tipoEntrega || 'Digital',
      observaciones: registro.observaciones || '',
    });
    setEditandoId(registro.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarRegistro = (id) => {
    setRegistros((prev) => prev.filter((r) => r.id !== id));
    if (editandoId === id) {
      limpiarFormulario();
    }
  };

  const borrarTodo = () => {
    const confirmado = window.confirm(
      '¿Seguro que quieres borrar todos los registros?'
    );
    if (!confirmado) return;
    setRegistros([]);
    localStorage.removeItem('imadent_registros');
    limpiarFormulario();
  };

  const registrosSemanaActual = useMemo(() => {
    return registros.filter((r) => r.semanaClave === semanaActual.clave);
  }, [registros, semanaActual.clave]);

  const registrosBase = verHistorial ? registros : registrosSemanaActual;

  const registrosVisibles = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();
    const clinicaTexto = filtroClinica.toLowerCase().trim();

    return registrosBase.filter((r) => {
      const coincideBusqueda = [
        r.folio,
        r.nombre,
        r.fecha,
        r.telefono,
        r.correo,
        r.estudio,
        r.tipoPago,
        r.estadoPago,
        r.clinica,
        r.tipoEntrega,
        r.observaciones,
        r.semanaClave,
      ]
        .join(' ')
        .toLowerCase()
        .includes(texto);

      const coincideClinica = clinicaTexto
        ? (r.clinica || '').toLowerCase().includes(clinicaTexto)
        : true;

      const coincideDesde = fechaDesde ? r.fecha >= fechaDesde : true;
      const coincideHasta = fechaHasta ? r.fecha <= fechaHasta : true;

      return (
        coincideBusqueda && coincideClinica && coincideDesde && coincideHasta
      );
    });
  }, [registrosBase, busqueda, filtroClinica, fechaDesde, fechaHasta]);

  const totalIngresos = registrosVisibles.reduce(
    (suma, r) => suma + Number(r.precio || 0),
    0
  );

  const totalComisiones = registrosVisibles.reduce(
    (suma, r) => suma + Number(r.comision || 0),
    0
  );

  const totalCobrado = registrosVisibles
    .filter((r) => r.estadoPago === 'Pagado')
    .reduce((suma, r) => suma + Number(r.precio || 0), 0);

  const totalPendiente = registrosVisibles
    .filter((r) => r.estadoPago === 'Pendiente')
    .reduce((suma, r) => suma + Number(r.precio || 0), 0);

  const utilidadNeta = totalIngresos - totalComisiones;

  const totalPacientes = registrosVisibles.length;
  const totalPano = registrosVisibles.filter(
    (r) => r.estudio === 'Panorámica'
  ).length;
  const totalLateral = registrosVisibles.filter(
    (r) => r.estudio === 'Lateral'
  ).length;
  const totalAmbos = registrosVisibles.filter(
    (r) => r.estudio === 'Panorámica y Lateral'
  ).length;
  const totalDigital = registrosVisibles.filter(
    (r) => r.tipoEntrega === 'Digital'
  ).length;
  const totalImpresa = registrosVisibles.filter(
    (r) => r.tipoEntrega === 'Impresa'
  ).length;

  const resumenSemanal = useMemo(() => {
    const mapa = {};

    for (const r of registros) {
      if (!mapa[r.semanaClave]) {
        mapa[r.semanaClave] = {
          pacientes: 0,
          ingresos: 0,
          comisiones: 0,
          neto: 0,
          cobrado: 0,
          pendiente: 0,
        };
      }

      mapa[r.semanaClave].pacientes += 1;
      mapa[r.semanaClave].ingresos += Number(r.precio || 0);
      mapa[r.semanaClave].comisiones += Number(r.comision || 0);
      mapa[r.semanaClave].neto +=
        Number(r.precio || 0) - Number(r.comision || 0);

      if (r.estadoPago === 'Pagado') {
        mapa[r.semanaClave].cobrado += Number(r.precio || 0);
      }

      if (r.estadoPago === 'Pendiente') {
        mapa[r.semanaClave].pendiente += Number(r.precio || 0);
      }
    }

    return Object.entries(mapa)
      .map(([semana, datos]) => ({
        semana,
        pacientes: datos.pacientes,
        ingresos: datos.ingresos,
        comisiones: datos.comisiones,
        neto: datos.neto,
        cobrado: datos.cobrado,
        pendiente: datos.pendiente,
      }))
      .sort((a, b) => b.semana.localeCompare(a.semana));
  }, [registros]);

  const resumenClinicas = useMemo(() => {
    const mapa = {};

    for (const r of registrosVisibles) {
      const nombreClinica = (r.clinica || '').trim();
      if (!nombreClinica) continue;

      if (!mapa[nombreClinica]) {
        mapa[nombreClinica] = {
          pacientes: 0,
          digital: 0,
          impresa: 0,
          comisionTotal: 0,
          ingresosGenerados: 0,
          pagado: 0,
          pendiente: 0,
        };
      }

      mapa[nombreClinica].pacientes += 1;
      mapa[nombreClinica].comisionTotal += Number(r.comision || 0);
      mapa[nombreClinica].ingresosGenerados += Number(r.precio || 0);

      if (r.tipoEntrega === 'Digital') mapa[nombreClinica].digital += 1;
      if (r.tipoEntrega === 'Impresa') mapa[nombreClinica].impresa += 1;
      if (r.estadoPago === 'Pagado')
        mapa[nombreClinica].pagado += Number(r.precio || 0);
      if (r.estadoPago === 'Pendiente')
        mapa[nombreClinica].pendiente += Number(r.precio || 0);
    }

    return Object.entries(mapa)
      .map(([clinica, datos]) => ({
        clinica,
        pacientes: datos.pacientes,
        digital: datos.digital,
        impresa: datos.impresa,
        comisionTotal: datos.comisionTotal,
        ingresosGenerados: datos.ingresosGenerados,
        pagado: datos.pagado,
        pendiente: datos.pendiente,
      }))
      .sort((a, b) => b.comisionTotal - a.comisionTotal);
  }, [registrosVisibles]);

  const estilos = {
    pagina: {
      minHeight: '100vh',
      background: '#f3f4f6',
      padding: '24px',
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box',
    },
    contenedor: {
      maxWidth: '1450px',
      margin: '0 auto',
    },
    titulo: {
      margin: 0,
      fontSize: '34px',
      color: '#111827',
    },
    subtitulo: {
      color: '#6b7280',
      marginTop: '8px',
      marginBottom: '24px',
    },
    gridResumen: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '16px',
      marginBottom: '24px',
    },
    tarjeta: {
      background: '#ffffff',
      borderRadius: '16px',
      padding: '18px',
      boxShadow: '0 4px 18px rgba(0,0,0,0.08)',
      border: '1px solid #e5e7eb',
    },
    numero: {
      fontSize: '28px',
      fontWeight: '700',
      marginTop: '8px',
      color: '#111827',
    },
    layout: {
      display: 'grid',
      gridTemplateColumns: '380px 1fr',
      gap: '20px',
    },
    panel: {
      background: '#ffffff',
      borderRadius: '16px',
      padding: '18px',
      boxShadow: '0 4px 18px rgba(0,0,0,0.08)',
      border: '1px solid #e5e7eb',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '700',
      color: '#374151',
      marginBottom: '6px',
      marginTop: '12px',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '10px',
      boxSizing: 'border-box',
      fontSize: '14px',
    },
    botonPrincipal: {
      width: '100%',
      marginTop: '16px',
      padding: '12px 16px',
      border: 'none',
      borderRadius: '12px',
      background: '#111827',
      color: 'white',
      fontWeight: '700',
      cursor: 'pointer',
    },
    botonSecundario: {
      padding: '10px 14px',
      border: 'none',
      borderRadius: '12px',
      background: '#e5e7eb',
      color: '#111827',
      fontWeight: '700',
      cursor: 'pointer',
    },
    botonActivo: {
      padding: '10px 14px',
      border: 'none',
      borderRadius: '12px',
      background: '#111827',
      color: '#ffffff',
      fontWeight: '700',
      cursor: 'pointer',
    },
    botonPeligro: {
      padding: '10px 14px',
      border: 'none',
      borderRadius: '12px',
      background: '#fee2e2',
      color: '#991b1b',
      fontWeight: '700',
      cursor: 'pointer',
    },
    cabeceraTabla: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: '16px',
    },
    tablaWrapper: {
      overflowX: 'auto',
    },
    tabla: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px',
    },
    th: {
      textAlign: 'left',
      padding: '10px',
      borderBottom: '1px solid #e5e7eb',
      background: '#f9fafb',
      whiteSpace: 'nowrap',
    },
    td: {
      padding: '10px',
      borderBottom: '1px solid #e5e7eb',
      verticalAlign: 'top',
    },
    filaVacia: {
      padding: '18px',
      textAlign: 'center',
      color: '#6b7280',
    },
    acciones: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
  };

  return (
    <div style={estilos.pagina}>
      <div style={estilos.contenedor}>
        <h1 style={estilos.titulo}>Imadent Centro Radiologico Dental</h1>
        <p style={estilos.subtitulo}>
          Control total por semana, clínicas, pagos y comisiones.
        </p>

        <div style={estilos.gridResumen}>
          <div style={estilos.tarjeta}>
            <strong>
              {verHistorial ? 'Pacientes visibles' : 'Pacientes de esta semana'}
            </strong>
            <div style={estilos.numero}>{totalPacientes}</div>
          </div>
          <div style={estilos.tarjeta}>
            <strong>Ingresos</strong>
            <div style={estilos.numero}>${totalIngresos}</div>
          </div>
          <div style={estilos.tarjeta}>
            <strong>Comisiones</strong>
            <div style={estilos.numero}>${totalComisiones}</div>
          </div>
          <div style={estilos.tarjeta}>
            <strong>Neto</strong>
            <div style={estilos.numero}>${utilidadNeta}</div>
          </div>
          <div style={estilos.tarjeta}>
            <strong>Cobrado</strong>
            <div style={estilos.numero}>${totalCobrado}</div>
          </div>
          <div style={estilos.tarjeta}>
            <strong>Pendiente</strong>
            <div style={estilos.numero}>${totalPendiente}</div>
          </div>
          <div style={estilos.tarjeta}>
            <strong>Panorámica</strong>
            <div style={estilos.numero}>{totalPano}</div>
          </div>
          <div style={estilos.tarjeta}>
            <strong>Lateral</strong>
            <div style={estilos.numero}>{totalLateral}</div>
          </div>
          <div style={estilos.tarjeta}>
            <strong>Ambos</strong>
            <div style={estilos.numero}>{totalAmbos}</div>
          </div>
          <div style={estilos.tarjeta}>
            <strong>Digital</strong>
            <div style={estilos.numero}>{totalDigital}</div>
          </div>
          <div style={estilos.tarjeta}>
            <strong>Impresa</strong>
            <div style={estilos.numero}>{totalImpresa}</div>
          </div>
        </div>

        <div style={estilos.layout}>
          <div style={estilos.panel}>
            <h2>{editandoId ? 'Editar paciente' : 'Nuevo paciente'}</h2>

            <label style={estilos.label}>Fecha de atención</label>
            <input
              style={estilos.input}
              type="date"
              value={formulario.fecha}
              onChange={(e) => cambiarCampo('fecha', e.target.value)}
            />

            <label style={estilos.label}>Nombre completo</label>
            <input
              style={estilos.input}
              type="text"
              value={formulario.nombre}
              onChange={(e) => cambiarCampo('nombre', e.target.value)}
            />

            <label style={estilos.label}>Teléfono</label>
            <input
              style={estilos.input}
              type="text"
              value={formulario.telefono}
              onChange={(e) => cambiarCampo('telefono', e.target.value)}
            />

            <label style={estilos.label}>Correo</label>
            <input
              style={estilos.input}
              type="email"
              value={formulario.correo}
              onChange={(e) => cambiarCampo('correo', e.target.value)}
            />

            <label style={estilos.label}>Estudio</label>
            <select
              style={estilos.input}
              value={formulario.estudio}
              onChange={(e) => cambiarCampo('estudio', e.target.value)}
            >
              <option value="Panorámica">Panorámica</option>
              <option value="Lateral">Lateral</option>
              <option value="Panorámica y Lateral">Panorámica y Lateral</option>
            </select>

            <label style={estilos.label}>Precio</label>
            <input
              style={{ ...estilos.input, background: '#f9fafb' }}
              type="text"
              value={`$${PRECIOS[formulario.estudio]}`}
              disabled
            />

            <label style={estilos.label}>Tipo de pago</label>
            <select
              style={estilos.input}
              value={formulario.tipoPago}
              onChange={(e) => cambiarCampo('tipoPago', e.target.value)}
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Tarjeta">Tarjeta</option>
            </select>

            <label style={estilos.label}>Estado de pago</label>
            <select
              style={estilos.input}
              value={formulario.estadoPago}
              onChange={(e) => cambiarCampo('estadoPago', e.target.value)}
            >
              <option value="Pagado">Pagado</option>
              <option value="Pendiente">Pendiente</option>
            </select>

            <label style={estilos.label}>Clínica</label>
            <input
              style={estilos.input}
              type="text"
              value={formulario.clinica}
              onChange={(e) => cambiarCampo('clinica', e.target.value)}
              placeholder="Nombre de la clínica"
            />

            <label style={estilos.label}>Tipo de entrega</label>
            <select
              style={estilos.input}
              value={formulario.tipoEntrega}
              onChange={(e) => cambiarCampo('tipoEntrega', e.target.value)}
            >
              <option value="Digital">Digital</option>
              <option value="Impresa">Impresa</option>
            </select>

            <label style={estilos.label}>Comisión</label>
            <input
              style={{ ...estilos.input, background: '#f9fafb' }}
              type="text"
              value={`$${COMISIONES_ENTREGA[formulario.tipoEntrega]}`}
              disabled
            />

            <label style={estilos.label}>Observaciones</label>
            <input
              style={estilos.input}
              type="text"
              value={formulario.observaciones}
              onChange={(e) => cambiarCampo('observaciones', e.target.value)}
            />

            <button style={estilos.botonPrincipal} onClick={guardarPaciente}>
              {editandoId ? 'Actualizar paciente' : 'Guardar paciente'}
            </button>

            {editandoId && (
              <button
                style={{
                  ...estilos.botonSecundario,
                  width: '100%',
                  marginTop: '10px',
                }}
                onClick={limpiarFormulario}
              >
                Cancelar edición
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            <div style={estilos.panel}>
              <div style={estilos.cabeceraTabla}>
                <div>
                  <h2 style={{ margin: 0 }}>
                    {verHistorial ? 'Historial' : 'Semana actual'}
                  </h2>
                  <p style={{ margin: '8px 0 0 0', color: '#6b7280' }}>
                    Semana actual: {semanaActual.clave}
                  </p>
                </div>

                <div style={estilos.acciones}>
                  <input
                    style={{ ...estilos.input, width: '180px' }}
                    type="text"
                    placeholder="Buscar general"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                  <input
                    style={{ ...estilos.input, width: '180px' }}
                    type="text"
                    placeholder="Buscar clínica"
                    value={filtroClinica}
                    onChange={(e) => setFiltroClinica(e.target.value)}
                  />
                  <input
                    style={{ ...estilos.input, width: '150px' }}
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                  />
                  <input
                    style={{ ...estilos.input, width: '150px' }}
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                  />

                  <button
                    style={
                      verHistorial
                        ? estilos.botonSecundario
                        : estilos.botonActivo
                    }
                    onClick={() => setVerHistorial(false)}
                  >
                    Semana actual
                  </button>

                  <button
                    style={
                      verHistorial
                        ? estilos.botonActivo
                        : estilos.botonSecundario
                    }
                    onClick={() => setVerHistorial(true)}
                  >
                    Historial
                  </button>

                  <button
                    style={estilos.botonSecundario}
                    onClick={() => exportarCSV(registrosVisibles)}
                  >
                    Exportar vista
                  </button>

                  <button style={estilos.botonPeligro} onClick={borrarTodo}>
                    Borrar todo
                  </button>
                </div>
              </div>

              <div style={estilos.tablaWrapper}>
                <table style={estilos.tabla}>
                  <thead>
                    <tr>
                      <th style={estilos.th}>Folio</th>
                      <th style={estilos.th}>Fecha</th>
                      <th style={estilos.th}>Semana</th>
                      <th style={estilos.th}>Nombre</th>
                      <th style={estilos.th}>Teléfono</th>
                      <th style={estilos.th}>Correo</th>
                      <th style={estilos.th}>Estudio</th>
                      <th style={estilos.th}>Precio</th>
                      <th style={estilos.th}>Pago</th>
                      <th style={estilos.th}>Estado</th>
                      <th style={estilos.th}>Clínica</th>
                      <th style={estilos.th}>Entrega</th>
                      <th style={estilos.th}>Comisión</th>
                      <th style={estilos.th}>Observaciones</th>
                      <th style={estilos.th}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosVisibles.length === 0 ? (
                      <tr>
                        <td style={estilos.filaVacia} colSpan="15">
                          No hay registros para esta búsqueda.
                        </td>
                      </tr>
                    ) : (
                      registrosVisibles.map((r) => (
                        <tr key={r.id}>
                          <td style={estilos.td}>{r.folio}</td>
                          <td style={estilos.td}>{r.fecha}</td>
                          <td style={estilos.td}>{r.semanaClave}</td>
                          <td style={estilos.td}>{r.nombre}</td>
                          <td style={estilos.td}>{r.telefono || '-'}</td>
                          <td style={estilos.td}>{r.correo || '-'}</td>
                          <td style={estilos.td}>{r.estudio}</td>
                          <td style={estilos.td}>${r.precio}</td>
                          <td style={estilos.td}>{r.tipoPago}</td>
                          <td style={estilos.td}>{r.estadoPago}</td>
                          <td style={estilos.td}>{r.clinica || '-'}</td>
                          <td style={estilos.td}>{r.tipoEntrega}</td>
                          <td style={estilos.td}>${r.comision}</td>
                          <td style={estilos.td}>{r.observaciones || '-'}</td>
                          <td style={estilos.td}>
                            <div
                              style={{
                                display: 'flex',
                                gap: '8px',
                                flexWrap: 'wrap',
                              }}
                            >
                              <button
                                style={estilos.botonSecundario}
                                onClick={() => editarRegistro(r)}
                              >
                                Editar
                              </button>
                              <button
                                style={estilos.botonPeligro}
                                onClick={() => eliminarRegistro(r.id)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={estilos.panel}>
              <h2>Resumen por clínica</h2>

              <div style={estilos.tablaWrapper}>
                <table style={estilos.tabla}>
                  <thead>
                    <tr>
                      <th style={estilos.th}>Clínica</th>
                      <th style={estilos.th}>Pacientes</th>
                      <th style={estilos.th}>Digitales</th>
                      <th style={estilos.th}>Impresas</th>
                      <th style={estilos.th}>Comisión total</th>
                      <th style={estilos.th}>Ingresos generados</th>
                      <th style={estilos.th}>Cobrado</th>
                      <th style={estilos.th}>Pendiente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenClinicas.length === 0 ? (
                      <tr>
                        <td style={estilos.filaVacia} colSpan="8">
                          No hay clínicas en esta vista.
                        </td>
                      </tr>
                    ) : (
                      resumenClinicas.map((item) => (
                        <tr key={item.clinica}>
                          <td style={estilos.td}>{item.clinica}</td>
                          <td style={estilos.td}>{item.pacientes}</td>
                          <td style={estilos.td}>{item.digital}</td>
                          <td style={estilos.td}>{item.impresa}</td>
                          <td style={estilos.td}>${item.comisionTotal}</td>
                          <td style={estilos.td}>${item.ingresosGenerados}</td>
                          <td style={estilos.td}>${item.pagado}</td>
                          <td style={estilos.td}>${item.pendiente}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={estilos.panel}>
              <h2>Resumen semanal</h2>

              <div style={estilos.tablaWrapper}>
                <table style={estilos.tabla}>
                  <thead>
                    <tr>
                      <th style={estilos.th}>Semana</th>
                      <th style={estilos.th}>Pacientes</th>
                      <th style={estilos.th}>Ingresos</th>
                      <th style={estilos.th}>Comisiones</th>
                      <th style={estilos.th}>Neto</th>
                      <th style={estilos.th}>Cobrado</th>
                      <th style={estilos.th}>Pendiente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenSemanal.length === 0 ? (
                      <tr>
                        <td style={estilos.filaVacia} colSpan="7">
                          Aún no hay semanas registradas.
                        </td>
                      </tr>
                    ) : (
                      resumenSemanal.map((item) => (
                        <tr key={item.semana}>
                          <td style={estilos.td}>{item.semana}</td>
                          <td style={estilos.td}>{item.pacientes}</td>
                          <td style={estilos.td}>${item.ingresos}</td>
                          <td style={estilos.td}>${item.comisiones}</td>
                          <td style={estilos.td}>${item.neto}</td>
                          <td style={estilos.td}>${item.cobrado}</td>
                          <td style={estilos.td}>${item.pendiente}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

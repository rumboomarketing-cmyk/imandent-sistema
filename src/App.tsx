// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import html2canvas from 'html2canvas';

/* =========================================================
   CONFIGURACIÓN GENERAL
   ========================================================= */

const PRECIOS = {
  Panorámica: 350,
  Lateral: 350,
  'Panorámica y Lateral': 700,
};

const COMISIONES_ENTREGA = {
  Digital: 50,
  Impresa: 40,
};

const CLINICAS_INICIALES = [
  {
    id: 'MILITARES',
    nombre: 'MILITARES',
    doctores: [
      'Dra. Paola Martínez',
      'Dr. Xavier Zurita',
      'Dr. Luis Flores',
      'Dra. Itzel Ham',
      'Dra. Aislin Cabrera',
      'Dr. Pedro Bautista',
    ],
  },
  {
    id: 'PRODENTAL',
    nombre: 'PRODENTAL',
    doctores: [
      'Dra. Fátima Madrid',
      'Dr. José Rodolfo',
      'Dra. Melissa Baray',
      'Dra. Itzel Ham',
      'Dra. Fanny',
    ],
  },
  {
    id: 'CREANDO SONRISAS',
    nombre: 'CREANDO SONRISAS',
    doctores: ['Dr. Luis Flores'],
  },
  {
    id: 'DENTALPRO',
    nombre: 'DENTALPRO',
    doctores: ['Dr. Elder Manuel', 'Dr. William'],
  },
  {
    id: 'DENTAL EXPRESS',
    nombre: 'DENTAL EXPRESS',
    doctores: [],
  },
  {
    id: 'IMADENT',
    nombre: 'IMADENT',
    doctores: ['Dr. Mario Esquivel'],
  },
  {
    id: 'SAN JOSÉ',
    nombre: 'SAN JOSÉ',
    doctores: ['Dr. José Rodolfo'],
  },
];

const FORMULARIO_INICIAL = {
  fecha: '',
  nombre: '',
  telefono: '',
  correo: '',
  estudio: 'Panorámica',
  tipoPago: 'Efectivo',
  estadoPago: 'Pagado',
  clinica: '',
  doctor: '',
  tipoEntrega: 'Digital',
  observaciones: '',
};

function fechaHoyTexto() {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  const d = String(hoy.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mesActualTexto() {
  return fechaHoyTexto().slice(0, 7);
}

function obtenerMes(fecha) {
  if (!fecha) return '';
  return fecha.slice(0, 7);
}

function nombreMes(mes) {
  if (!mes) return '';
  const [anio, numeroMes] = mes.split('-');
  const fecha = new Date(Number(anio), Number(numeroMes) - 1, 1);
  return new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric',
  }).format(fecha);
}

function obtenerSemanaInfo(fecha) {
  if (!fecha) {
    return { clave: 'Sin fecha', anio: 0, semana: 0 };
  }

  const d = new Date(fecha + 'T00:00:00');
  const inicioAnio = new Date(d.getFullYear(), 0, 1);
  const dias = Math.floor((d.getTime() - inicioAnio.getTime()) / 86400000);
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

function normalizar(texto = '') {
  return texto
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function slugify(texto) {
  return normalizar(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatoDinero(numero) {
  return Number(numero || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  });
}

function obtenerComisionRegistro(registro) {
  if (registro.comision !== undefined && registro.comision !== null) {
    return Number(registro.comision || 0);
  }
  return Number(COMISIONES_ENTREGA[registro.tipoEntrega] || 0);
}

function obtenerDoctorRegistro(registro, catalogo) {
  if (registro.doctor && registro.doctor.trim()) {
    return registro.doctor.trim();
  }

  const observacion = (registro.observaciones || '').trim();
  if (!observacion) return 'SIN DOCTOR';

  const observacionNormalizada = normalizar(observacion);

  for (const clinica of catalogo) {
    for (const doctor of clinica.doctores || []) {
      const nombreDoctor = normalizar(doctor);
      const sinTitulo = nombreDoctor
        .replace('dra. ', '')
        .replace('dr. ', '');

      if (
        observacionNormalizada.includes(nombreDoctor) ||
        observacionNormalizada.includes(sinTitulo)
      ) {
        return doctor;
      }
    }
  }

  const palabras = observacion.split(/\s+/);

  if (
    observacion.length <= 50 &&
    palabras.length <= 6 &&
    !observacionNormalizada.includes('radiografia') &&
    !observacionNormalizada.includes('envio') &&
    !observacionNormalizada.includes('enviado') &&
    !observacionNormalizada.includes('entregado')
  ) {
    return observacion;
  }

  return 'SIN DOCTOR';
}

export default function App() {
  const [seccion, setSeccion] = useState('dashboard');

  const [formulario, setFormulario] = useState({
    ...FORMULARIO_INICIAL,
    fecha: fechaHoyTexto(),
  });

  const [editandoId, setEditandoId] = useState(null);

  /* CONSERVA EXACTAMENTE LOS REGISTROS ACTUALES */
  const [registros, setRegistros] = useState(() => {
    try {
      const guardados = localStorage.getItem('imadent_registros');
      return guardados ? JSON.parse(guardados) : [];
    } catch (error) {
      console.error(error);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('imadent_registros', JSON.stringify(registros));
  }, [registros]);

  /* CATÁLOGO EDITABLE DE CLÍNICAS Y DOCTORES */
  const [clinicasCatalogo, setClinicasCatalogo] = useState(() => {
    try {
      const guardadas = localStorage.getItem('imadent_catalogo_clinicas');
      return guardadas ? JSON.parse(guardadas) : CLINICAS_INICIALES;
    } catch {
      return CLINICAS_INICIALES;
    }
  });

  useEffect(() => {
    localStorage.setItem(
      'imadent_catalogo_clinicas',
      JSON.stringify(clinicasCatalogo)
    );
  }, [clinicasCatalogo]);

  const [nuevaClinica, setNuevaClinica] = useState('');
  const [clinicaAdmin, setClinicaAdmin] = useState('');
  const [nuevoDoctor, setNuevoDoctor] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [filtroClinica, setFiltroClinica] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [mesComisiones, setMesComisiones] = useState(mesActualTexto());
  const [clinicaComisiones, setClinicaComisiones] = useState('TODAS');
  const [doctorComisiones, setDoctorComisiones] = useState('TODOS');

  const clinicaSeleccionada = useMemo(() => {
    return clinicasCatalogo.find((c) => c.nombre === formulario.clinica);
  }, [formulario.clinica, clinicasCatalogo]);

  const doctoresDisponibles = clinicaSeleccionada?.doctores || [];

  function cambiarCampo(campo, valor) {
    setFormulario((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  function seleccionarClinica(valor) {
    setFormulario((prev) => ({
      ...prev,
      clinica: valor,
      doctor: '',
    }));
  }

  function limpiarFormulario() {
    setFormulario({
      ...FORMULARIO_INICIAL,
      fecha: fechaHoyTexto(),
    });
    setEditandoId(null);
  }

  function agregarClinica() {
    const nombre = nuevaClinica.trim();
    if (!nombre) {
      alert('Escribe el nombre de la clínica.');
      return;
    }

    const yaExiste = clinicasCatalogo.some(
      (c) => normalizar(c.nombre) === normalizar(nombre)
    );

    if (yaExiste) {
      alert('Esa clínica ya existe.');
      return;
    }

    const nueva = {
      id: `${slugify(nombre)}-${Date.now()}`,
      nombre,
      doctores: [],
    };

    setClinicasCatalogo((prev) => [...prev, nueva]);
    setNuevaClinica('');
    setClinicaAdmin(nombre);
  }

  function agregarDoctor() {
    const doctor = nuevoDoctor.trim();

    if (!clinicaAdmin) {
      alert('Selecciona primero una clínica.');
      return;
    }

    if (!doctor) {
      alert('Escribe el nombre del doctor.');
      return;
    }

    setClinicasCatalogo((prev) =>
      prev.map((clinica) => {
        if (clinica.nombre !== clinicaAdmin) return clinica;

        const yaExiste = (clinica.doctores || []).some(
          (d) => normalizar(d) === normalizar(doctor)
        );

        if (yaExiste) {
          alert('Ese doctor ya está registrado en esta clínica.');
          return clinica;
        }

        return {
          ...clinica,
          doctores: [...(clinica.doctores || []), doctor],
        };
      })
    );

    setNuevoDoctor('');
  }

  function eliminarDoctor(clinicaNombre, doctor) {
    const confirmado = window.confirm(
      `¿Quitar a "${doctor}" de ${clinicaNombre}?\n\nLos registros históricos no se borrarán.`
    );

    if (!confirmado) return;

    setClinicasCatalogo((prev) =>
      prev.map((clinica) =>
        clinica.nombre === clinicaNombre
          ? {
              ...clinica,
              doctores: (clinica.doctores || []).filter((d) => d !== doctor),
            }
          : clinica
      )
    );
  }

  function eliminarClinica(clinicaNombre) {
    const confirmado = window.confirm(
      `¿Eliminar "${clinicaNombre}" del catálogo?\n\nEsto NO elimina pacientes ni comisiones históricas.`
    );

    if (!confirmado) return;

    setClinicasCatalogo((prev) =>
      prev.filter((clinica) => clinica.nombre !== clinicaNombre)
    );

    if (clinicaAdmin === clinicaNombre) {
      setClinicaAdmin('');
    }

    if (formulario.clinica === clinicaNombre) {
      cambiarCampo('clinica', '');
      cambiarCampo('doctor', '');
    }
  }

  function guardarPaciente() {
    if (!formulario.fecha) {
      alert('Selecciona la fecha.');
      return;
    }

    if (!formulario.nombre.trim()) {
      alert('Escribe el nombre del paciente.');
      return;
    }

    if (!formulario.clinica) {
      alert('Selecciona la clínica.');
      return;
    }

    if (!formulario.doctor) {
      alert('Selecciona el doctor.');
      return;
    }

    const semanaInfo = obtenerSemanaInfo(formulario.fecha);
    const precio = PRECIOS[formulario.estudio] || 0;
    const comision = COMISIONES_ENTREGA[formulario.tipoEntrega] || 0;

    if (editandoId) {
      setRegistros((prev) =>
        prev.map((registro) =>
          registro.id === editandoId
            ? {
                ...registro,
                fecha: formulario.fecha,
                semanaClave: semanaInfo.clave,
                nombre: formulario.nombre.trim(),
                telefono: formulario.telefono.trim(),
                correo: formulario.correo.trim(),
                estudio: formulario.estudio,
                precio,
                tipoPago: formulario.tipoPago,
                estadoPago: formulario.estadoPago,
                clinica: formulario.clinica,
                doctor: formulario.doctor,
                tipoEntrega: formulario.tipoEntrega,
                comision,
                observaciones: formulario.observaciones.trim(),
              }
            : registro
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
      nombre: formulario.nombre.trim(),
      telefono: formulario.telefono.trim(),
      correo: formulario.correo.trim(),
      estudio: formulario.estudio,
      precio,
      tipoPago: formulario.tipoPago,
      estadoPago: formulario.estadoPago,
      clinica: formulario.clinica,
      doctor: formulario.doctor,
      tipoEntrega: formulario.tipoEntrega,
      comision,
      observaciones: formulario.observaciones.trim(),
    };

    setRegistros((prev) => [nuevoRegistro, ...prev]);
    limpiarFormulario();
  }

  function editarRegistro(registro) {
    const doctor = obtenerDoctorRegistro(registro, clinicasCatalogo);

    setFormulario({
      fecha: registro.fecha || fechaHoyTexto(),
      nombre: registro.nombre || '',
      telefono: registro.telefono || '',
      correo: registro.correo || '',
      estudio: registro.estudio || 'Panorámica',
      tipoPago: registro.tipoPago || 'Efectivo',
      estadoPago: registro.estadoPago || 'Pagado',
      clinica: registro.clinica || '',
      doctor: doctor === 'SIN DOCTOR' ? '' : doctor,
      tipoEntrega: registro.tipoEntrega || 'Digital',
      observaciones: registro.doctor ? registro.observaciones || '' : '',
    });

    setEditandoId(registro.id);
    setSeccion('pacientes');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function eliminarRegistro(id) {
    const confirmar = window.confirm('¿Eliminar este registro?');
    if (!confirmar) return;

    setRegistros((prev) => prev.filter((r) => r.id !== id));
  }

  const registrosVisibles = useMemo(() => {
    const texto = normalizar(busqueda);

    return registros.filter((r) => {
      const coincideBusqueda = normalizar(
        [
          r.folio,
          r.nombre,
          r.telefono,
          r.correo,
          r.estudio,
          r.clinica,
          obtenerDoctorRegistro(r, clinicasCatalogo),
          r.tipoPago,
          r.estadoPago,
          r.tipoEntrega,
          r.observaciones,
          r.fecha,
        ].join(' ')
      ).includes(texto);

      const coincideClinica =
        !filtroClinica || r.clinica === filtroClinica;

      const coincideDesde = !fechaDesde || r.fecha >= fechaDesde;
      const coincideHasta = !fechaHasta || r.fecha <= fechaHasta;

      return (
        coincideBusqueda &&
        coincideClinica &&
        coincideDesde &&
        coincideHasta
      );
    });
  }, [
    registros,
    busqueda,
    filtroClinica,
    fechaDesde,
    fechaHasta,
    clinicasCatalogo,
  ]);

  const mesActual = mesActualTexto();

  const registrosMesActual = useMemo(
    () => registros.filter((r) => obtenerMes(r.fecha) === mesActual),
    [registros, mesActual]
  );

  const totalPacientesMes = registrosMesActual.length;

  const totalIngresosMes = registrosMesActual.reduce(
    (total, r) => total + Number(r.precio || 0),
    0
  );

  const totalComisionesMes = registrosMesActual.reduce(
    (total, r) => total + obtenerComisionRegistro(r),
    0
  );

  const totalCobradoMes = registrosMesActual
    .filter((r) => r.estadoPago === 'Pagado')
    .reduce((total, r) => total + Number(r.precio || 0), 0);

  const totalPendienteMes = registrosMesActual
    .filter((r) => r.estadoPago === 'Pendiente')
    .reduce((total, r) => total + Number(r.precio || 0), 0);

  const panoramicasMes = registrosMesActual.filter(
    (r) => r.estudio === 'Panorámica'
  ).length;

  const lateralesMes = registrosMesActual.filter(
    (r) => r.estudio === 'Lateral'
  ).length;

  const ambosMes = registrosMesActual.filter(
    (r) => r.estudio === 'Panorámica y Lateral'
  ).length;

  const mesesDisponibles = useMemo(() => {
    const meses = new Set();

    registros.forEach((r) => {
      const mes = obtenerMes(r.fecha);
      if (mes) meses.add(mes);
    });

    meses.add(mesActualTexto());

    return Array.from(meses).sort((a, b) => b.localeCompare(a));
  }, [registros]);

  const doctoresFiltro = useMemo(() => {
    const doctores = new Set();

    registros.forEach((r) => {
      const doctor = obtenerDoctorRegistro(r, clinicasCatalogo);
      if (doctor && doctor !== 'SIN DOCTOR') {
        doctores.add(doctor);
      }
    });

    clinicasCatalogo.forEach((clinica) => {
      (clinica.doctores || []).forEach((doctor) => doctores.add(doctor));
    });

    return Array.from(doctores).sort((a, b) => a.localeCompare(b, 'es'));
  }, [registros, clinicasCatalogo]);

  const registrosComisiones = useMemo(() => {
    return registros.filter((r) => {
      const coincideMes =
        mesComisiones === 'TODOS' ||
        obtenerMes(r.fecha) === mesComisiones;

      const coincideClinica =
        clinicaComisiones === 'TODAS' ||
        r.clinica === clinicaComisiones;

      const doctor = obtenerDoctorRegistro(r, clinicasCatalogo);

      const coincideDoctor =
        doctorComisiones === 'TODOS' ||
        doctor === doctorComisiones;

      return coincideMes && coincideClinica && coincideDoctor;
    });
  }, [
    registros,
    mesComisiones,
    clinicaComisiones,
    doctorComisiones,
    clinicasCatalogo,
  ]);

  const resumenDoctores = useMemo(() => {
    const mapa = {};

    registrosComisiones.forEach((registro) => {
      const doctor = obtenerDoctorRegistro(registro, clinicasCatalogo);
      const clinica = registro.clinica || 'SIN CLÍNICA';
      const clave = `${clinica}|||${doctor}`;

      if (!mapa[clave]) {
        mapa[clave] = {
          clave,
          doctor,
          clinica,
          pacientes: 0,
          digitales: 0,
          impresas: 0,
          comisionTotal: 0,
          ingresosGenerados: 0,
        };
      }

      mapa[clave].pacientes += 1;
      mapa[clave].comisionTotal += obtenerComisionRegistro(registro);
      mapa[clave].ingresosGenerados += Number(registro.precio || 0);

      if (registro.tipoEntrega === 'Digital') {
        mapa[clave].digitales += 1;
      }

      if (registro.tipoEntrega === 'Impresa') {
        mapa[clave].impresas += 1;
      }
    });

    return Object.values(mapa).sort(
      (a, b) => b.comisionTotal - a.comisionTotal
    );
  }, [registrosComisiones, clinicasCatalogo]);

  const resumenMeses = useMemo(() => {
    const mapa = {};

    registros.forEach((r) => {
      const mes = obtenerMes(r.fecha);
      if (!mes) return;

      if (!mapa[mes]) {
        mapa[mes] = {
          mes,
          pacientes: 0,
          ingresos: 0,
          comisiones: 0,
        };
      }

      mapa[mes].pacientes += 1;
      mapa[mes].ingresos += Number(r.precio || 0);
      mapa[mes].comisiones += obtenerComisionRegistro(r);
    });

    return Object.values(mapa).sort((a, b) =>
      b.mes.localeCompare(a.mes)
    );
  }, [registros]);

  const totalPacientesComisiones = registrosComisiones.length;

  const totalComisionesFiltradas = registrosComisiones.reduce(
    (total, r) => total + obtenerComisionRegistro(r),
    0
  );

  const totalIngresosComisiones = registrosComisiones.reduce(
    (total, r) => total + Number(r.precio || 0),
    0
  );

  async function descargarReporteDoctor(item) {
    const id = `reporte-${slugify(item.clinica)}-${slugify(item.doctor)}`;
    const elemento = document.getElementById(id);

    if (!elemento) {
      alert('No se pudo generar el reporte.');
      return;
    }

    try {
      const canvas = await html2canvas(elemento, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      const enlace = document.createElement('a');

      enlace.download =
        `IMADENT-Comision-${slugify(item.doctor)}-${
          mesComisiones === 'TODOS'
            ? 'todos-los-meses'
            : mesComisiones
        }.png`;

      enlace.href = canvas.toDataURL('image/png', 1);
      enlace.click();
    } catch (error) {
      console.error(error);
      alert('No se pudo generar la imagen.');
    }
  }

  function exportarCSV() {
    const encabezados = [
      'Folio',
      'Fecha',
      'Semana',
      'Paciente',
      'Telefono',
      'Correo',
      'Estudio',
      'Precio',
      'Pago',
      'Estado',
      'Clinica',
      'Doctor',
      'Entrega',
      'Comision',
      'Observaciones',
    ];

    const filas = registrosVisibles.map((r) => [
      r.folio,
      r.fecha,
      r.semanaClave,
      `"${(r.nombre || '').replace(/"/g, '""')}"`,
      r.telefono || '',
      r.correo || '',
      r.estudio,
      r.precio,
      r.tipoPago,
      r.estadoPago,
      `"${(r.clinica || '').replace(/"/g, '""')}"`,
      `"${obtenerDoctorRegistro(r, clinicasCatalogo).replace(/"/g, '""')}"`,
      r.tipoEntrega,
      obtenerComisionRegistro(r),
      `"${(r.observaciones || '').replace(/"/g, '""')}"`,
    ]);

    const contenido = [encabezados, ...filas]
      .map((fila) => fila.join(','))
      .join('\n');

    const blob = new Blob([contenido], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'IMADENT-registros.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  }

  function descargarRespaldo() {
    const contenido = JSON.stringify(
      {
        registros,
        clinicasCatalogo,
        fechaRespaldo: new Date().toISOString(),
      },
      null,
      2
    );

    const blob = new Blob([contenido], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `IMADENT-respaldo-${fechaHoyTexto()}.json`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  function importarRespaldo(evento) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;

    const lector = new FileReader();

    lector.onload = (e) => {
      try {
        const datos = JSON.parse(e.target?.result);

        let nuevosRegistros = null;
        let nuevoCatalogo = null;

        if (Array.isArray(datos)) {
          nuevosRegistros = datos;
        } else if (datos && Array.isArray(datos.registros)) {
          nuevosRegistros = datos.registros;
          if (Array.isArray(datos.clinicasCatalogo)) {
            nuevoCatalogo = datos.clinicasCatalogo;
          }
        } else {
          throw new Error('Formato incorrecto');
        }

        const confirmar = window.confirm(
          `Se encontraron ${nuevosRegistros.length} registros.\n\n¿Deseas restaurar este respaldo?`
        );

        if (!confirmar) return;

        setRegistros(nuevosRegistros);

        if (nuevoCatalogo) {
          setClinicasCatalogo(nuevoCatalogo);
        }

        alert('Respaldo restaurado correctamente.');
      } catch (error) {
        alert('El archivo de respaldo no es válido.');
      }
    };

    lector.readAsText(archivo);
  }

  const css = `
    *{box-sizing:border-box}
    body{margin:0;background:#f4f7fb;color:#172033;font-family:Inter,Arial,sans-serif}
    button,input,select,textarea{font:inherit}
    .app{min-height:100vh;background:linear-gradient(180deg,#eef8fb 0,#f5f7fb 240px)}
    .header{background:linear-gradient(135deg,#062b3c,#095b68);color:#fff;padding:26px 28px;box-shadow:0 10px 30px rgba(4,38,52,.18)}
    .header-inner{max-width:1500px;margin:auto;display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}
    .brand-title{font-size:30px;font-weight:900;letter-spacing:-.5px}.brand-title span{color:#44d4d0}
    .brand-sub{margin-top:5px;opacity:.82;font-size:14px}
    .fecha-header{background:rgba(255,255,255,.11);border:1px solid rgba(255,255,255,.15);border-radius:14px;padding:12px 18px;font-weight:700}
    .nav{max-width:1500px;margin:22px auto 0;padding:0 22px;display:flex;gap:10px;flex-wrap:wrap}
    .nav button{border:0;padding:12px 18px;border-radius:12px;background:#fff;color:#394456;cursor:pointer;font-weight:800;box-shadow:0 5px 16px rgba(20,40,60,.06)}
    .nav button.active{background:#087d87;color:#fff}
    .container{max-width:1500px;margin:auto;padding:22px}
    .page-title{margin:0 0 5px;font-size:26px}.page-subtitle{margin:0 0 24px;color:#738093}
    .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:15px;margin-bottom:22px}
    .kpi{background:#fff;border:1px solid #e8edf3;border-radius:18px;padding:18px;box-shadow:0 8px 25px rgba(22,43,65,.06)}
    .kpi-label{color:#718096;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.4px}
    .kpi-value{font-size:29px;font-weight:900;margin-top:7px;color:#102a3c}.kpi-accent{border-top:4px solid #11a2a0}
    .grid-2{display:grid;grid-template-columns:390px minmax(0,1fr);gap:20px;align-items:start}
    .card{background:#fff;border:1px solid #e6ebf1;border-radius:18px;padding:20px;box-shadow:0 8px 30px rgba(20,42,62,.06)}
    .card-title{font-size:19px;font-weight:900;margin-bottom:18px}
    .form-row{margin-bottom:13px}
    label{display:block;font-size:13px;font-weight:800;color:#48566a;margin-bottom:6px}
    input,select,textarea{width:100%;border:1px solid #d9e0e8;background:#fbfcfd;color:#182535;padding:11px 12px;border-radius:11px;outline:none}
    input:focus,select:focus,textarea:focus{border-color:#0b9da3;box-shadow:0 0 0 3px rgba(11,157,163,.11)}
    .readonly{background:#eef4f5;font-weight:900;color:#08747b}
    .btn{border:0;border-radius:11px;padding:11px 15px;font-weight:850;cursor:pointer}
    .btn-primary{background:linear-gradient(135deg,#087b86,#0ca3a4);color:#fff}
    .btn-dark{background:#162c3a;color:#fff}.btn-light{background:#edf2f6;color:#304154}
    .btn-danger{background:#ffe8ea;color:#a52f39}.btn-success{background:#e4f8f4;color:#087568}.btn-full{width:100%}
    .toolbar{display:grid;grid-template-columns:minmax(200px,2fr) repeat(3,minmax(150px,1fr));gap:10px;margin-bottom:16px}
    .table-wrap{overflow-x:auto;border:1px solid #edf0f4;border-radius:14px}
    table{width:100%;border-collapse:collapse;min-width:980px}
    th{background:#f3f7f9;color:#526175;text-align:left;padding:12px 11px;font-size:12px;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap}
    td{border-top:1px solid #edf0f3;padding:11px;font-size:13px;vertical-align:top}
    tbody tr:hover{background:#fbfdfd}.actions{display:flex;gap:6px;flex-wrap:wrap}
    .filters-comisiones{display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:12px;margin-bottom:20px}
    .doctor-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:18px}
    .commission-report{background:#fff;border-radius:22px;border:1px solid #dce7ea;overflow:hidden;box-shadow:0 10px 28px rgba(22,42,60,.07)}
    .report-head{background:linear-gradient(135deg,#082d3f,#087b86);color:#fff;padding:18px}
    .report-brand{font-weight:950;font-size:20px}.report-brand span{color:#49d5d1}
    .report-clinic{font-size:12px;opacity:.82;margin-top:3px}.report-body{padding:20px}
    .doctor-name{font-size:22px;font-weight:950;color:#122b3b;margin-bottom:4px}
    .doctor-clinic{color:#6f7c8e;font-weight:700;margin-bottom:18px}
    .report-stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px}
    .report-stat{padding:13px;border-radius:13px;background:#f1f7f8}
    .report-stat small{display:block;color:#738194;font-weight:800}
    .report-stat strong{display:block;margin-top:4px;font-size:20px;color:#0b6670}
    .report-total{background:#082e3e;color:#fff;border-radius:14px;padding:15px;display:flex;justify-content:space-between;align-items:center;font-weight:900}
    .report-total strong{font-size:24px;color:#52d4ce}
    .report-note{font-size:11px;color:#7c8795;margin-top:12px}
    .report-actions{padding:0 20px 20px}.month-table{margin-top:20px}
    .backup-box{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px}
    .empty{text-align:center;padding:40px 20px;color:#798799}
    .admin-grid{display:grid;grid-template-columns:360px 1fr;gap:20px}
    .clinic-card{border:1px solid #e5ebf0;border-radius:15px;padding:15px;margin-bottom:12px;background:#fbfdfe}
    .clinic-top{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px}
    .doctor-list{display:flex;flex-wrap:wrap;gap:8px}
    .doctor-chip{display:flex;align-items:center;gap:7px;background:#edf7f7;border:1px solid #d8eceb;border-radius:999px;padding:7px 10px;font-size:13px;font-weight:700}
    .doctor-chip button{border:0;background:transparent;color:#a52f39;cursor:pointer;font-weight:900}
    @media(max-width:950px){
      .grid-2,.admin-grid{grid-template-columns:1fr}
      .toolbar,.filters-comisiones{grid-template-columns:1fr}
      .container{padding:14px}.header{padding:20px 16px}.brand-title{font-size:25px}
    }
  `;

  return (
    <div className="app">
      <style>{css}</style>

      <header className="header">
        <div className="header-inner">
          <div>
            <div className="brand-title">
              IMA<span>DENT</span>
            </div>
            <div className="brand-sub">
              Centro Radiológico Dental · Sistema administrativo
            </div>
          </div>

          <div className="fecha-header">
            {new Intl.DateTimeFormat('es-MX', {
              dateStyle: 'long',
            }).format(new Date())}
          </div>
        </div>
      </header>

      <nav className="nav">
        <button
          className={seccion === 'dashboard' ? 'active' : ''}
          onClick={() => setSeccion('dashboard')}
        >
          📊 Dashboard
        </button>

        <button
          className={seccion === 'pacientes' ? 'active' : ''}
          onClick={() => setSeccion('pacientes')}
        >
          👤 Pacientes
        </button>

        <button
          className={seccion === 'comisiones' ? 'active' : ''}
          onClick={() => setSeccion('comisiones')}
        >
          💰 Comisiones
        </button>

        <button
          className={seccion === 'configuracion' ? 'active' : ''}
          onClick={() => setSeccion('configuracion')}
        >
          ⚙ Clínicas y doctores
        </button>

        <button
          className={seccion === 'respaldo' ? 'active' : ''}
          onClick={() => setSeccion('respaldo')}
        >
          💾 Respaldo
        </button>
      </nav>

      <main className="container">
        {seccion === 'dashboard' && (
          <>
            <h1 className="page-title">
              Resumen de {nombreMes(mesActual)}
            </h1>
            <p className="page-subtitle">
              Información del mes actual.
            </p>

            <div className="kpis">
              <div className="kpi kpi-accent">
                <div className="kpi-label">Pacientes</div>
                <div className="kpi-value">{totalPacientesMes}</div>
              </div>

              <div className="kpi kpi-accent">
                <div className="kpi-label">Ingresos</div>
                <div className="kpi-value">
                  {formatoDinero(totalIngresosMes)}
                </div>
              </div>

              <div className="kpi kpi-accent">
                <div className="kpi-label">Comisiones</div>
                <div className="kpi-value">
                  {formatoDinero(totalComisionesMes)}
                </div>
              </div>

              <div className="kpi">
                <div className="kpi-label">Cobrado</div>
                <div className="kpi-value">
                  {formatoDinero(totalCobradoMes)}
                </div>
              </div>

              <div className="kpi">
                <div className="kpi-label">Pendiente</div>
                <div className="kpi-value">
                  {formatoDinero(totalPendienteMes)}
                </div>
              </div>

              <div className="kpi">
                <div className="kpi-label">Panorámicas</div>
                <div className="kpi-value">{panoramicasMes}</div>
              </div>

              <div className="kpi">
                <div className="kpi-label">Laterales</div>
                <div className="kpi-value">{lateralesMes}</div>
              </div>

              <div className="kpi">
                <div className="kpi-label">Ambos estudios</div>
                <div className="kpi-value">{ambosMes}</div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Resumen de todos los meses</div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Mes</th>
                      <th>Pacientes</th>
                      <th>Ingresos</th>
                      <th>Comisiones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenMeses.map((mes) => (
                      <tr key={mes.mes}>
                        <td><strong>{nombreMes(mes.mes)}</strong></td>
                        <td>{mes.pacientes}</td>
                        <td>{formatoDinero(mes.ingresos)}</td>
                        <td>{formatoDinero(mes.comisiones)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {seccion === 'pacientes' && (
          <>
            <h1 className="page-title">Control de pacientes</h1>
            <p className="page-subtitle">
              Registro de estudios, pagos, clínicas, doctores y comisiones.
            </p>

            <div className="grid-2">
              <div className="card">
                <div className="card-title">
                  {editandoId ? 'Editar paciente' : 'Nuevo paciente'}
                </div>

                <div className="form-row">
                  <label>Fecha de atención</label>
                  <input
                    type="date"
                    value={formulario.fecha}
                    onChange={(e) => cambiarCampo('fecha', e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <label>Nombre completo</label>
                  <input
                    value={formulario.nombre}
                    onChange={(e) => cambiarCampo('nombre', e.target.value)}
                    placeholder="Nombre del paciente"
                  />
                </div>

                <div className="form-row">
                  <label>Teléfono</label>
                  <input
                    value={formulario.telefono}
                    onChange={(e) => cambiarCampo('telefono', e.target.value)}
                    placeholder="Teléfono"
                  />
                </div>

                <div className="form-row">
                  <label>Correo</label>
                  <input
                    type="email"
                    value={formulario.correo}
                    onChange={(e) => cambiarCampo('correo', e.target.value)}
                    placeholder="Opcional"
                  />
                </div>

                <div className="form-row">
                  <label>Estudio</label>
                  <select
                    value={formulario.estudio}
                    onChange={(e) => cambiarCampo('estudio', e.target.value)}
                  >
                    <option value="Panorámica">Panorámica</option>
                    <option value="Lateral">Lateral</option>
                    <option value="Panorámica y Lateral">
                      Panorámica y Lateral
                    </option>
                  </select>
                </div>

                <div className="form-row">
                  <label>Precio</label>
                  <input
                    className="readonly"
                    disabled
                    value={formatoDinero(PRECIOS[formulario.estudio])}
                  />
                </div>

                <div className="form-row">
                  <label>Tipo de pago</label>
                  <select
                    value={formulario.tipoPago}
                    onChange={(e) => cambiarCampo('tipoPago', e.target.value)}
                  >
                    <option>Efectivo</option>
                    <option>Transferencia</option>
                    <option>Tarjeta</option>
                  </select>
                </div>

                <div className="form-row">
                  <label>Estado de pago</label>
                  <select
                    value={formulario.estadoPago}
                    onChange={(e) =>
                      cambiarCampo('estadoPago', e.target.value)
                    }
                  >
                    <option>Pagado</option>
                    <option>Pendiente</option>
                  </select>
                </div>

                <div className="form-row">
                  <label>Clínica</label>
                  <select
                    value={formulario.clinica}
                    onChange={(e) => seleccionarClinica(e.target.value)}
                  >
                    <option value="">Seleccionar clínica</option>
                    {clinicasCatalogo.map((clinica) => (
                      <option key={clinica.id} value={clinica.nombre}>
                        {clinica.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <label>Doctor(a)</label>
                  <select
                    value={formulario.doctor}
                    onChange={(e) => cambiarCampo('doctor', e.target.value)}
                    disabled={!formulario.clinica}
                  >
                    <option value="">Seleccionar doctor</option>
                    {doctoresDisponibles.map((doctor) => (
                      <option key={doctor} value={doctor}>
                        {doctor}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <label>Tipo de entrega</label>
                  <select
                    value={formulario.tipoEntrega}
                    onChange={(e) =>
                      cambiarCampo('tipoEntrega', e.target.value)
                    }
                  >
                    <option>Digital</option>
                    <option>Impresa</option>
                  </select>
                </div>

                <div className="form-row">
                  <label>Comisión</label>
                  <input
                    disabled
                    className="readonly"
                    value={formatoDinero(
                      COMISIONES_ENTREGA[formulario.tipoEntrega]
                    )}
                  />
                </div>

                <div className="form-row">
                  <label>Observaciones</label>
                  <textarea
                    rows={3}
                    value={formulario.observaciones}
                    onChange={(e) =>
                      cambiarCampo('observaciones', e.target.value)
                    }
                    placeholder="Notas adicionales"
                  />
                </div>

                <button
                  className="btn btn-primary btn-full"
                  onClick={guardarPaciente}
                >
                  {editandoId ? 'Actualizar paciente' : 'Guardar paciente'}
                </button>

                {editandoId && (
                  <button
                    className="btn btn-light btn-full"
                    style={{ marginTop: 8 }}
                    onClick={limpiarFormulario}
                  >
                    Cancelar edición
                  </button>
                )}
              </div>

              <div className="card">
                <div className="card-title">Pacientes registrados</div>

                <div className="toolbar">
                  <input
                    placeholder="Buscar paciente, doctor..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />

                  <select
                    value={filtroClinica}
                    onChange={(e) => setFiltroClinica(e.target.value)}
                  >
                    <option value="">Todas las clínicas</option>
                    {clinicasCatalogo.map((c) => (
                      <option key={c.id} value={c.nombre}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                  />

                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <button className="btn btn-light" onClick={exportarCSV}>
                    Exportar CSV
                  </button>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Paciente</th>
                        <th>Estudio</th>
                        <th>Precio</th>
                        <th>Clínica</th>
                        <th>Doctor</th>
                        <th>Entrega</th>
                        <th>Comisión</th>
                        <th>Pago</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {registrosVisibles.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="empty">
                            No hay registros.
                          </td>
                        </tr>
                      ) : (
                        registrosVisibles.map((r) => (
                          <tr key={r.id}>
                            <td>{r.fecha}</td>
                            <td><strong>{r.nombre}</strong></td>
                            <td>{r.estudio}</td>
                            <td>{formatoDinero(r.precio)}</td>
                            <td>{r.clinica || '-'}</td>
                            <td>
                              {obtenerDoctorRegistro(r, clinicasCatalogo)}
                            </td>
                            <td>{r.tipoEntrega}</td>
                            <td>
                              {formatoDinero(obtenerComisionRegistro(r))}
                            </td>
                            <td>{r.estadoPago}</td>
                            <td>
                              <div className="actions">
                                <button
                                  className="btn btn-light"
                                  onClick={() => editarRegistro(r)}
                                >
                                  Editar
                                </button>

                                <button
                                  className="btn btn-danger"
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
            </div>
          </>
        )}

        {seccion === 'comisiones' && (
          <>
            <h1 className="page-title">Comisiones de doctores</h1>
            <p className="page-subtitle">
              Consulta por mes, clínica o doctor y descarga el reporte en imagen.
            </p>

            <div className="card">
              <div className="filters-comisiones">
                <div>
                  <label>Mes</label>
                  <select
                    value={mesComisiones}
                    onChange={(e) => setMesComisiones(e.target.value)}
                  >
                    <option value="TODOS">📅 Todos los meses</option>
                    {mesesDisponibles.map((mes) => (
                      <option key={mes} value={mes}>
                        {nombreMes(mes)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Clínica</label>
                  <select
                    value={clinicaComisiones}
                    onChange={(e) => setClinicaComisiones(e.target.value)}
                  >
                    <option value="TODAS">Todas las clínicas</option>
                    {clinicasCatalogo.map((c) => (
                      <option key={c.id} value={c.nombre}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Doctor</label>
                  <select
                    value={doctorComisiones}
                    onChange={(e) => setDoctorComisiones(e.target.value)}
                  >
                    <option value="TODOS">Todos los doctores</option>
                    {doctoresFiltro.map((doctor) => (
                      <option key={doctor} value={doctor}>
                        {doctor}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="kpis" style={{ marginTop: 18 }}>
              <div className="kpi kpi-accent">
                <div className="kpi-label">Pacientes</div>
                <div className="kpi-value">{totalPacientesComisiones}</div>
              </div>

              <div className="kpi kpi-accent">
                <div className="kpi-label">Total comisiones</div>
                <div className="kpi-value">
                  {formatoDinero(totalComisionesFiltradas)}
                </div>
              </div>

              <div className="kpi">
                <div className="kpi-label">Ingresos generados</div>
                <div className="kpi-value">
                  {formatoDinero(totalIngresosComisiones)}
                </div>
              </div>

              <div className="kpi">
                <div className="kpi-label">Periodo</div>
                <div className="kpi-value" style={{ fontSize: 18 }}>
                  {mesComisiones === 'TODOS'
                    ? 'Todos los meses'
                    : nombreMes(mesComisiones)}
                </div>
              </div>
            </div>

            {resumenDoctores.length === 0 ? (
              <div className="card empty">
                No hay comisiones para los filtros seleccionados.
              </div>
            ) : (
              <div className="doctor-grid">
                {resumenDoctores.map((item) => {
                  const reportId = `reporte-${slugify(
                    item.clinica
                  )}-${slugify(item.doctor)}`;

                  return (
                    <div className="commission-report" key={item.clave}>
                      <div id={reportId}>
                        <div className="report-head">
                          <div className="report-brand">
                            IMA<span>DENT</span>
                          </div>
                          <div className="report-clinic">
                            CENTRO RADIOLÓGICO DENTAL
                          </div>
                        </div>

                        <div className="report-body">
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 900,
                              color: '#0c8790',
                              marginBottom: 6,
                              textTransform: 'uppercase',
                            }}
                          >
                            Reporte de comisiones
                          </div>

                          <div className="doctor-name">{item.doctor}</div>

                          <div className="doctor-clinic">
                            {item.clinica} ·{' '}
                            {mesComisiones === 'TODOS'
                              ? 'Todos los meses'
                              : nombreMes(mesComisiones)}
                          </div>

                          <div className="report-stat-grid">
                            <div className="report-stat">
                              <small>Pacientes</small>
                              <strong>{item.pacientes}</strong>
                            </div>

                            <div className="report-stat">
                              <small>Digitales</small>
                              <strong>{item.digitales}</strong>
                            </div>

                            <div className="report-stat">
                              <small>Impresas</small>
                              <strong>{item.impresas}</strong>
                            </div>

                            <div className="report-stat">
                              <small>Ingresos</small>
                              <strong>
                                {formatoDinero(item.ingresosGenerados)}
                              </strong>
                            </div>
                          </div>

                          <div className="report-total">
                            <span>TOTAL A PAGAR</span>
                            <strong>
                              {formatoDinero(item.comisionTotal)}
                            </strong>
                          </div>

                          <div className="report-note">
                            Comisiones calculadas automáticamente según el tipo
                            de entrega registrado.
                          </div>
                        </div>
                      </div>

                      <div className="report-actions">
                        <button
                          className="btn btn-primary btn-full"
                          onClick={() => descargarReporteDoctor(item)}
                        >
                          ⬇ Descargar imagen
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="card month-table">
              <div className="card-title">
                Historial de comisiones por mes
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Mes</th>
                      <th>Pacientes</th>
                      <th>Ingresos</th>
                      <th>Comisiones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {resumenMeses.map((item) => (
                      <tr key={item.mes}>
                        <td><strong>{nombreMes(item.mes)}</strong></td>
                        <td>{item.pacientes}</td>
                        <td>{formatoDinero(item.ingresos)}</td>
                        <td><strong>{formatoDinero(item.comisiones)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {seccion === 'configuracion' && (
          <>
            <h1 className="page-title">Clínicas y doctores</h1>
            <p className="page-subtitle">
              Agrega nuevas clínicas y doctores sin tener que modificar el código.
            </p>

            <div className="admin-grid">
              <div className="card">
                <div className="card-title">Agregar clínica</div>

                <div className="form-row">
                  <label>Nombre de la nueva clínica</label>
                  <input
                    value={nuevaClinica}
                    onChange={(e) => setNuevaClinica(e.target.value)}
                    placeholder="Ej. Clínica Dental Norte"
                  />
                </div>

                <button
                  className="btn btn-primary btn-full"
                  onClick={agregarClinica}
                >
                  + Agregar clínica
                </button>

                <hr
                  style={{
                    border: 0,
                    borderTop: '1px solid #e8edf1',
                    margin: '22px 0',
                  }}
                />

                <div className="card-title">Agregar doctor</div>

                <div className="form-row">
                  <label>Clínica</label>
                  <select
                    value={clinicaAdmin}
                    onChange={(e) => setClinicaAdmin(e.target.value)}
                  >
                    <option value="">Seleccionar clínica</option>
                    {clinicasCatalogo.map((c) => (
                      <option key={c.id} value={c.nombre}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <label>Nombre del doctor(a)</label>
                  <input
                    value={nuevoDoctor}
                    onChange={(e) => setNuevoDoctor(e.target.value)}
                    placeholder="Ej. Dra. María López"
                  />
                </div>

                <button
                  className="btn btn-primary btn-full"
                  onClick={agregarDoctor}
                >
                  + Agregar doctor
                </button>
              </div>

              <div className="card">
                <div className="card-title">
                  Catálogo actual
                </div>

                {clinicasCatalogo.length === 0 ? (
                  <div className="empty">No hay clínicas registradas.</div>
                ) : (
                  clinicasCatalogo.map((clinica) => (
                    <div className="clinic-card" key={clinica.id}>
                      <div className="clinic-top">
                        <div>
                          <strong style={{ fontSize: 17 }}>
                            {clinica.nombre}
                          </strong>
                          <div
                            style={{
                              color: '#748196',
                              fontSize: 12,
                              marginTop: 3,
                            }}
                          >
                            {(clinica.doctores || []).length} doctor(es)
                          </div>
                        </div>

                        <button
                          className="btn btn-danger"
                          onClick={() => eliminarClinica(clinica.nombre)}
                        >
                          Eliminar clínica
                        </button>
                      </div>

                      {(clinica.doctores || []).length === 0 ? (
                        <div style={{ color: '#8a95a4', fontSize: 13 }}>
                          Todavía no hay doctores en esta clínica.
                        </div>
                      ) : (
                        <div className="doctor-list">
                          {clinica.doctores.map((doctor) => (
                            <div className="doctor-chip" key={doctor}>
                              <span>{doctor}</span>
                              <button
                                title="Quitar doctor"
                                onClick={() =>
                                  eliminarDoctor(clinica.nombre, doctor)
                                }
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}

                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 12,
                    background: '#eef8f7',
                    color: '#356664',
                    lineHeight: 1.55,
                    fontSize: 13,
                  }}
                >
                  Si eliminas una clínica o doctor de este catálogo, los
                  pacientes y comisiones que ya registraste no se eliminan.
                  Solo dejará de aparecer como opción para registros nuevos.
                </div>
              </div>
            </div>
          </>
        )}

        {seccion === 'respaldo' && (
          <>
            <h1 className="page-title">Respaldo de información</h1>
            <p className="page-subtitle">
              Descarga una copia de pacientes, comisiones, clínicas y doctores.
            </p>

            <div className="card">
              <div className="card-title">Seguridad de datos</div>

              <p>
                Actualmente hay <strong>{registros.length}</strong> registros
                guardados y <strong>{clinicasCatalogo.length}</strong> clínicas
                en el catálogo.
              </p>

              <div className="backup-box">
                <button
                  className="btn btn-primary"
                  onClick={descargarRespaldo}
                >
                  ⬇ Descargar respaldo
                </button>

                <label
                  className="btn btn-light"
                  style={{ cursor: 'pointer', margin: 0 }}
                >
                  ⬆ Restaurar respaldo
                  <input
                    type="file"
                    accept=".json"
                    onChange={importarRespaldo}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <div
                style={{
                  background: '#edf8f7',
                  padding: 15,
                  borderRadius: 12,
                  color: '#25615f',
                  lineHeight: 1.6,
                }}
              >
                <strong>Importante:</strong>
                <br />
                Los pacientes siguen guardándose en{' '}
                <code>imadent_registros</code>. El catálogo de clínicas y
                doctores se guarda por separado en{' '}
                <code>imadent_catalogo_clinicas</code>.
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

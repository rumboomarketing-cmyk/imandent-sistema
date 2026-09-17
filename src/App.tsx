// IMADENT v7 · sin correo + comisión sí/no + guardado flexible + reportes PNG
// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';

const PRECIOS = {
  'Panorámica': 350,
  'Lateral': 350,
  'Panorámica y Lateral': 700,
};

const COMISIONES = { Digital: 50, Impresa: 40 };

const CLINICAS_BASE = [
  { id: 'MILITARES', nombre: 'MILITARES', doctores: ['Dra. Paola Martínez','Dr. Xavier Zurita','Dr. Luis Flores','Dra. Itzel Ham','Dra. Aislin Cabrera','Dr. Pedro Bautista'] },
  { id: 'PRODENTAL', nombre: 'PRODENTAL', doctores: ['Dra. Fátima Madrid','Dr. José Rodolfo','Dra. Melissa Baray','Dra. Itzel Ham','Dra. Fanny'] },
  { id: 'CREANDO SONRISAS', nombre: 'CREANDO SONRISAS', doctores: ['Dr. Luis Flores'] },
  { id: 'DENTALPRO', nombre: 'DENTALPRO', doctores: ['Dr. Elder Manuel','Dr. William'] },
  { id: 'DENTAL EXPRESS', nombre: 'DENTAL EXPRESS', doctores: [] },
  { id: 'IMADENT', nombre: 'IMADENT', doctores: ['Dr. Mario Esquivel'] },
  { id: 'SAN JOSÉ', nombre: 'SAN JOSÉ', doctores: ['Dr. José Rodolfo'] },
];

const FORM_BASE = {
  fecha: '',
  nombre: '',
  telefono: '',
  estudio: 'Panorámica',
  tipoPago: 'Efectivo',
  estadoPago: 'Pagado',
  clinica: '',
  doctor: '',
  tipoEntrega: 'Digital',
  generaComision: true,
  observaciones: '',
};

const pad = n => String(n).padStart(2, '0');
const fechaLocal = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const hoy = () => fechaLocal(new Date());
const mesActual = () => hoy().slice(0,7);
const dinero = n => Number(n || 0).toLocaleString('es-MX', { style:'currency', currency:'MXN', maximumFractionDigits:0 });
const normalizar = (t='') => t.toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const slug = (t='') => normalizar(t).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'item';
const nombreSeguro = (t='reporte') => slug(t);

function nombreMes(m){
  if(!m) return '';
  const [y,mo] = m.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric'}).format(new Date(y,mo-1,1));
}
function lunesDeFecha(fecha){
  if(!fecha) return '';
  const d = new Date(`${fecha}T00:00:00`);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1-day));
  return fechaLocal(d);
}
function finSemana(lunes){
  if(!lunes) return '';
  const d = new Date(`${lunes}T00:00:00`);
  d.setDate(d.getDate()+6);
  return fechaLocal(d);
}
const etiquetaSemana = lunes => `${lunes} al ${finSemana(lunes)}`;

function generaComisionRegistro(r){
  return r?.generaComision !== false;
}
function comisionRegistro(r){
  if(!generaComisionRegistro(r)) return 0;
  if(r?.comision !== undefined && r?.comision !== null && r?.comision !== '') return Number(r.comision) || 0;
  return Number(COMISIONES[r?.tipoEntrega] || 0);
}
const precioRegistro = r => Number(r?.precio ?? PRECIOS[r?.estudio] ?? 0);

function inferirDoctor(r, catalogo){
  if(r?.doctor && String(r.doctor).trim()) return String(r.doctor).trim();
  const obs = normalizar(r?.observaciones || '');
  if(!obs) return 'SIN DOCTOR';
  for(const c of catalogo){
    for(const d of c.doctores || []){
      const n = normalizar(d);
      const corto = n.replace('dra. ','').replace('dr. ','');
      if(obs.includes(n) || (corto && obs.includes(corto))) return d;
    }
  }
  return 'SIN DOCTOR';
}

function resumen(lista){
  const pagos = { Efectivo:0, Transferencia:0, Tarjeta:0, Otro:0 };
  let ingresos=0, cobrado=0, pendiente=0, comisiones=0, conComision=0, sinComision=0;
  for(const r of lista){
    const p = precioRegistro(r);
    ingresos += p;
    comisiones += comisionRegistro(r);
    if(generaComisionRegistro(r)) conComision++; else sinComision++;
    if(r.estadoPago === 'Pagado') {
      cobrado += p;
      const tp = r.tipoPago || 'Otro';
      pagos[tp] = (pagos[tp] || 0) + p;
    } else {
      pendiente += p;
    }
  }
  return { pacientes:lista.length, ingresos, cobrado, pendiente, comisiones, pagos, conComision, sinComision };
}

function descargarTexto(nombre, texto, tipo='application/json'){
  const blob = new Blob([texto], {type:tipo});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.click();
  URL.revokeObjectURL(url);
}
function ellipsis(ctx,text,max){
  let s = String(text ?? '');
  if(ctx.measureText(s).width <= max) return s;
  while(s.length > 2 && ctx.measureText(s+'…').width > max) s=s.slice(0,-1);
  return s+'…';
}
function descargarReportePNG({titulo,subtitulo,resumenLineas=[],columnas=[],filas=[],archivo='reporte.png'}){
  const width=1600, margin=70, headerH=200, lineH=42, rowH=48;
  const summaryH = resumenLineas.length ? 60 + resumenLineas.length*lineH : 0;
  const tableH = columnas.length ? 70 + Math.max(1,filas.length)*rowH : 0;
  const height = Math.max(760, margin*2 + headerH + summaryH + tableH + 70);
  const canvas = document.createElement('canvas');
  canvas.width=width; canvas.height=height;
  const ctx = canvas.getContext('2d');
  if(!ctx) return;

  ctx.fillStyle='#f3f7f8'; ctx.fillRect(0,0,width,height);
  ctx.fillStyle='#073b45'; ctx.fillRect(0,0,width,headerH);
  ctx.fillStyle='#fff'; ctx.font='700 54px Arial'; ctx.fillText('IMA DENT',margin,82);
  ctx.font='700 34px Arial'; ctx.fillText(titulo,margin,140);
  ctx.font='24px Arial'; ctx.fillStyle='#cdebf0'; ctx.fillText(subtitulo,margin,177);

  let y=headerH+55;
  if(resumenLineas.length){
    ctx.fillStyle='#fff'; ctx.strokeStyle='#d5e3e6'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(margin,y-25,width-margin*2,summaryH,18); ctx.fill(); ctx.stroke();
    let sy=y+17;
    ctx.fillStyle='#20343b'; ctx.font='700 28px Arial'; ctx.fillText('Resumen',margin+28,sy);
    sy+=44; ctx.font='24px Arial';
    for(const line of resumenLineas){ctx.fillStyle='#344b54';ctx.fillText(line,margin+28,sy);sy+=lineH}
    y += summaryH+25;
  }

  if(columnas.length){
    const totalW=width-margin*2, sum=columnas.reduce((a,c)=>a+(c.peso||1),0);
    const widths=columnas.map(c=>totalW*(c.peso||1)/sum);
    ctx.fillStyle='#0b7f89';ctx.fillRect(margin,y,totalW,58);
    let x=margin;ctx.font='700 21px Arial';ctx.fillStyle='#fff';
    columnas.forEach((c,i)=>{ctx.fillText(ellipsis(ctx,c.titulo,widths[i]-18),x+9,y+37);x+=widths[i]});
    y+=58;ctx.font='20px Arial';
    if(!filas.length){
      ctx.fillStyle='#fff';ctx.fillRect(margin,y,totalW,rowH);
      ctx.fillStyle='#718089';ctx.fillText('Sin registros',margin+15,y+32);
    } else {
      filas.forEach((fila,ri)=>{
        ctx.fillStyle=ri%2===0?'#fff':'#edf5f6';ctx.fillRect(margin,y,totalW,rowH);
        let xx=margin;ctx.fillStyle='#24373e';
        columnas.forEach((c,i)=>{
          const val=typeof c.valor==='function'?c.valor(fila):fila[c.clave];
          ctx.fillText(ellipsis(ctx,val??'',widths[i]-18),xx+9,y+32);xx+=widths[i];
        });
        y+=rowH;
      });
    }
  }
  ctx.fillStyle='#698088';ctx.font='20px Arial';
  ctx.fillText(`Generado ${new Date().toLocaleString('es-MX')}`,margin,height-32);
  const a=document.createElement('a');a.download=archivo;a.href=canvas.toDataURL('image/png',1);a.click();
}

export default function App(){
  const [seccion,setSeccion] = useState('dashboard');
  const [registros,setRegistros] = useState(()=>{
    try{return JSON.parse(localStorage.getItem('imadent_registros')||'[]')}catch{return[]}
  });
  const [clinicas,setClinicas] = useState(()=>{
    try{return JSON.parse(localStorage.getItem('imadent_catalogo_clinicas')||'null')||CLINICAS_BASE}catch{return CLINICAS_BASE}
  });
  const [form,setForm] = useState({...FORM_BASE,fecha:hoy()});
  const [editId,setEditId] = useState(null);
  const [busqueda,setBusqueda] = useState('');
  const [filtro,setFiltro] = useState('semana');
  const [vistaDash,setVistaDash] = useState('semana');
  const [mesHist,setMesHist] = useState(mesActual());
  const [semanaCorte,setSemanaCorte] = useState(lunesDeFecha(hoy()));
  const [mesCom,setMesCom] = useState(mesActual());

  const [nuevaClinica,setNuevaClinica] = useState('');
  const [clinicaAdmin,setClinicaAdmin] = useState('');
  const [nombreClinicaEdit,setNombreClinicaEdit] = useState('');
  const [nuevoDoctor,setNuevoDoctor] = useState('');
  const [doctorAdmin,setDoctorAdmin] = useState('');
  const [nombreDoctorEdit,setNombreDoctorEdit] = useState('');
  const importRef = useRef(null);

  useEffect(()=>localStorage.setItem('imadent_registros',JSON.stringify(registros)),[registros]);
  useEffect(()=>localStorage.setItem('imadent_catalogo_clinicas',JSON.stringify(clinicas)),[clinicas]);

  const clinicaForm = useMemo(()=>clinicas.find(c=>c.nombre===form.clinica),[clinicas,form.clinica]);
  const doctoresForm = clinicaForm?.doctores || [];
  const semanaActual = lunesDeFecha(hoy());

  const regsSemana = useMemo(()=>registros.filter(r=>r.fecha && lunesDeFecha(r.fecha)===semanaActual),[registros,semanaActual]);
  const regsMes = useMemo(()=>registros.filter(r=>(r.fecha||'').slice(0,7)===mesActual()),[registros]);
  const resSemana = useMemo(()=>resumen(regsSemana),[regsSemana]);
  const resMes = useMemo(()=>resumen(regsMes),[regsMes]);

  const semanasDisponibles = useMemo(()=>{
    const set=new Set([semanaActual]);
    registros.forEach(r=>r.fecha&&set.add(lunesDeFecha(r.fecha)));
    return [...set].filter(Boolean).sort().reverse();
  },[registros,semanaActual]);

  const mesesDisponibles = useMemo(()=>{
    const set=new Set([mesActual()]);
    registros.forEach(r=>r.fecha&&set.add((r.fecha||'').slice(0,7)));
    return [...set].filter(Boolean).sort().reverse();
  },[registros]);

  const registrosLista = useMemo(()=>{
    let list=[...registros];
    if(filtro==='hoy') list=list.filter(r=>r.fecha===hoy());
    if(filtro==='semana') list=list.filter(r=>r.fecha&&lunesDeFecha(r.fecha)===semanaActual);
    if(filtro==='mes') list=list.filter(r=>(r.fecha||'').slice(0,7)===mesActual());
    if(filtro==='pendiente') list=list.filter(r=>r.estadoPago!=='Pagado');
    if(filtro==='sincomision') list=list.filter(r=>!generaComisionRegistro(r));
    if(busqueda.trim()){
      const q=normalizar(busqueda);
      list=list.filter(r=>[r.nombre,r.clinica,inferirDoctor(r,clinicas),r.estudio,r.folio].some(v=>normalizar(v||'').includes(q)));
    }
    return list.sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')||Number(b.id||0)-Number(a.id||0));
  },[registros,filtro,busqueda,clinicas,semanaActual]);

  const regsHist = useMemo(()=>registros.filter(r=>(r.fecha||'').slice(0,7)===mesHist).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')),[registros,mesHist]);
  const resHist = useMemo(()=>resumen(regsHist),[regsHist]);

  const regsCorte = useMemo(()=>registros.filter(r=>r.fecha&&lunesDeFecha(r.fecha)===semanaCorte).sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||'')),[registros,semanaCorte]);
  const resCorte = useMemo(()=>resumen(regsCorte),[regsCorte]);

  const regsCom = useMemo(()=>registros.filter(r=>(r.fecha||'').slice(0,7)===mesCom && comisionRegistro(r)>0),[registros,mesCom]);
  const totalComMes = useMemo(()=>regsCom.reduce((s,r)=>s+comisionRegistro(r),0),[regsCom]);

  const comClinicas = useMemo(()=>{
    const map={};
    for(const r of regsCom){
      const n=r.clinica||'SIN CLÍNICA';
      if(!map[n]) map[n]={nombre:n,pacientes:0,digital:0,impresa:0,total:0};
      map[n].pacientes++;
      const c=comisionRegistro(r); map[n].total+=c;
      if(r.tipoEntrega==='Impresa') map[n].impresa+=c; else map[n].digital+=c;
    }
    return Object.values(map).sort((a,b)=>a.nombre.localeCompare(b.nombre));
  },[regsCom]);

  const comDoctores = useMemo(()=>{
    const map={};
    for(const r of regsCom){
      const n=inferirDoctor(r,clinicas);
      if(!map[n]) map[n]={nombre:n,pacientes:0,total:0,clinicas:{}};
      map[n].pacientes++; map[n].total+=comisionRegistro(r);
      const c=r.clinica||'SIN CLÍNICA';
      map[n].clinicas[c]=(map[n].clinicas[c]||0)+comisionRegistro(r);
    }
    return Object.values(map).sort((a,b)=>a.nombre.localeCompare(b.nombre));
  },[regsCom,clinicas]);

  function setCampo(k,v){setForm(f=>({...f,[k]:v}))}
  function limpiar(){setForm({...FORM_BASE,fecha:hoy()});setEditId(null)}

  function guardar(){
    const fecha = form.fecha || hoy();
    const nombre = form.nombre.trim() || 'SIN NOMBRE';
    const genera = form.generaComision !== false;
    const base = {
      fecha,
      nombre,
      telefono:form.telefono.trim(),
      estudio:form.estudio || 'Panorámica',
      tipoPago:form.tipoPago || 'Efectivo',
      estadoPago:form.estadoPago || 'Pagado',
      clinica:form.clinica || '',
      doctor:form.doctor || '',
      tipoEntrega:form.tipoEntrega || 'Digital',
      generaComision:genera,
      observaciones:form.observaciones.trim(),
      precio:PRECIOS[form.estudio] || 0,
      comision:genera ? (COMISIONES[form.tipoEntrega] || 0) : 0,
    };
    if(editId!==null){
      setRegistros(rs=>rs.map(r=>r.id===editId?{...r,...base}:r));
    }else{
      setRegistros(rs=>[{...base,id:Date.now(),folio:`IMA-${Date.now()}`},...rs]);
    }
    limpiar(); setSeccion('pacientes');
  }

  function editar(r){
    const d=inferirDoctor(r,clinicas);
    setEditId(r.id);
    setForm({
      fecha:r.fecha||hoy(),
      nombre:r.nombre||'',
      telefono:r.telefono||'',
      estudio:r.estudio||'Panorámica',
      tipoPago:r.tipoPago||'Efectivo',
      estadoPago:r.estadoPago||'Pagado',
      clinica:r.clinica||'',
      doctor:d==='SIN DOCTOR'?'':d,
      tipoEntrega:r.tipoEntrega||'Digital',
      generaComision:generaComisionRegistro(r),
      observaciones:r.observaciones||'',
    });
    setSeccion('pacientes');
    setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),60);
  }
  function borrar(id){if(confirm('¿Eliminar este paciente?'))setRegistros(rs=>rs.filter(r=>r.id!==id))}

  function agregarClinica(){
    const n=nuevaClinica.trim(); if(!n) return;
    if(clinicas.some(c=>normalizar(c.nombre)===normalizar(n))){alert('La clínica ya existe.');return}
    setClinicas(cs=>[...cs,{id:`${slug(n)}-${Date.now()}`,nombre:n,doctores:[]}]); setNuevaClinica('');
  }
  function seleccionarClinicaAdmin(nombre){
    setClinicaAdmin(nombre);setNombreClinicaEdit(nombre);setDoctorAdmin('');setNombreDoctorEdit('');
  }
  function renombrarClinica(){
    const nuevo=nombreClinicaEdit.trim(); if(!clinicaAdmin||!nuevo) return;
    if(clinicas.some(c=>c.nombre!==clinicaAdmin&&normalizar(c.nombre)===normalizar(nuevo))){alert('Ya existe otra clínica con ese nombre.');return}
    const anterior=clinicaAdmin;
    setClinicas(cs=>cs.map(c=>c.nombre===anterior?{...c,nombre:nuevo}:c));
    setRegistros(rs=>rs.map(r=>r.clinica===anterior?{...r,clinica:nuevo}:r));
    if(form.clinica===anterior)setCampo('clinica',nuevo);
    setClinicaAdmin(nuevo);setNombreClinicaEdit(nuevo);
  }
  function eliminarClinica(){
    if(!clinicaAdmin)return;
    if(!confirm(`¿Quitar "${clinicaAdmin}" del catálogo? Los registros históricos no se borran.`))return;
    setClinicas(cs=>cs.filter(c=>c.nombre!==clinicaAdmin));
    setClinicaAdmin('');setNombreClinicaEdit('');setDoctorAdmin('');setNombreDoctorEdit('');
  }
  function agregarDoctor(){
    const n=nuevoDoctor.trim(); if(!clinicaAdmin||!n)return;
    setClinicas(cs=>cs.map(c=>{
      if(c.nombre!==clinicaAdmin)return c;
      if((c.doctores||[]).some(d=>normalizar(d)===normalizar(n))){alert('Ese doctor ya existe.');return c}
      return {...c,doctores:[...(c.doctores||[]),n]};
    }));
    setNuevoDoctor('');
  }
  function seleccionarDoctorAdmin(nombre){setDoctorAdmin(nombre);setNombreDoctorEdit(nombre)}
  function renombrarDoctor(){
    const nuevo=nombreDoctorEdit.trim(); if(!clinicaAdmin||!doctorAdmin||!nuevo)return;
    const anterior=doctorAdmin;
    setClinicas(cs=>cs.map(c=>c.nombre===clinicaAdmin?{...c,doctores:(c.doctores||[]).map(d=>d===anterior?nuevo:d)}:c));
    setRegistros(rs=>rs.map(r=>r.clinica===clinicaAdmin&&r.doctor===anterior?{...r,doctor:nuevo}:r));
    if(form.clinica===clinicaAdmin&&form.doctor===anterior)setCampo('doctor',nuevo);
    setDoctorAdmin(nuevo);setNombreDoctorEdit(nuevo);
  }
  function eliminarDoctor(){
    if(!clinicaAdmin||!doctorAdmin)return;
    if(!confirm(`¿Quitar "${doctorAdmin}" del catálogo? Los pacientes históricos no se borran.`))return;
    setClinicas(cs=>cs.map(c=>c.nombre===clinicaAdmin?{...c,doctores:(c.doctores||[]).filter(d=>d!==doctorAdmin)}:c));
    setDoctorAdmin('');setNombreDoctorEdit('');
  }

  function descargarCorte(){
    descargarReportePNG({
      titulo:'Corte semanal',
      subtitulo:etiquetaSemana(semanaCorte),
      resumenLineas:[
        `Pacientes: ${resCorte.pacientes}`,
        `Ingresos: ${dinero(resCorte.ingresos)}   •   Cobrado: ${dinero(resCorte.cobrado)}   •   Pendiente: ${dinero(resCorte.pendiente)}`,
        `Comisiones: ${dinero(resCorte.comisiones)}   •   Sin comisión: ${resCorte.sinComision} pacientes`,
        `Efectivo: ${dinero(resCorte.pagos.Efectivo)}   •   Transferencia: ${dinero(resCorte.pagos.Transferencia)}   •   Tarjeta: ${dinero(resCorte.pagos.Tarjeta)}`,
      ],
      columnas:[
        {titulo:'Fecha',peso:.9,valor:r=>r.fecha||'-'},
        {titulo:'Paciente',peso:1.5,valor:r=>r.nombre||'SIN NOMBRE'},
        {titulo:'Estudio',peso:1.4,valor:r=>r.estudio||'-'},
        {titulo:'Clínica',peso:1.3,valor:r=>r.clinica||'SIN CLÍNICA'},
        {titulo:'Doctor',peso:1.4,valor:r=>inferirDoctor(r,clinicas)},
        {titulo:'Precio',peso:.85,valor:r=>dinero(precioRegistro(r))},
        {titulo:'Comisión',peso:.85,valor:r=>dinero(comisionRegistro(r))},
      ],
      filas:regsCorte,
      archivo:`corte-semana-${semanaCorte}.png`,
    });
  }

  function descargarResumenClinicas(){
    descargarReportePNG({
      titulo:'Comisiones por clínica',
      subtitulo:nombreMes(mesCom),
      resumenLineas:[`Total de comisiones del mes: ${dinero(totalComMes)}`,`Pacientes con comisión: ${regsCom.length}`],
      columnas:[
        {titulo:'Clínica',peso:2,clave:'nombre'},
        {titulo:'Pacientes',peso:1,clave:'pacientes'},
        {titulo:'Digital',peso:1,valor:r=>dinero(r.digital)},
        {titulo:'Impresa',peso:1,valor:r=>dinero(r.impresa)},
        {titulo:'Total',peso:1,valor:r=>dinero(r.total)},
      ],
      filas:comClinicas,
      archivo:`comisiones-clinicas-${mesCom}.png`,
    });
  }

  function descargarClinica(nombre){
    const lista=regsCom.filter(r=>(r.clinica||'SIN CLÍNICA')===nombre);
    const total=lista.reduce((s,r)=>s+comisionRegistro(r),0);
    descargarReportePNG({
      titulo:`Comisiones · ${nombre}`,
      subtitulo:nombreMes(mesCom),
      resumenLineas:[`Pacientes con comisión: ${lista.length}`,`Total: ${dinero(total)}`],
      columnas:[
        {titulo:'Fecha',peso:1,valor:r=>r.fecha||'-'},
        {titulo:'Paciente',peso:1.7,valor:r=>r.nombre||'SIN NOMBRE'},
        {titulo:'Doctor',peso:1.6,valor:r=>inferirDoctor(r,clinicas)},
        {titulo:'Entrega',peso:1,valor:r=>r.tipoEntrega||'-'},
        {titulo:'Comisión',peso:1,valor:r=>dinero(comisionRegistro(r))},
      ],
      filas:lista,
      archivo:`comision-${nombreSeguro(nombre)}-${mesCom}.png`,
    });
  }

  function descargarResumenDoctores(){
    descargarReportePNG({
      titulo:'Comisiones por dentista',
      subtitulo:nombreMes(mesCom),
      resumenLineas:[`Total de comisiones del mes: ${dinero(totalComMes)}`,`Pacientes con comisión: ${regsCom.length}`],
      columnas:[
        {titulo:'Dentista',peso:2,clave:'nombre'},
        {titulo:'Pacientes',peso:1,clave:'pacientes'},
        {titulo:'Total',peso:1,valor:r=>dinero(r.total)},
      ],
      filas:comDoctores,
      archivo:`comisiones-dentistas-${mesCom}.png`,
    });
  }

  function descargarDoctor(nombre){
    const lista=regsCom.filter(r=>inferirDoctor(r,clinicas)===nombre);
    const total=lista.reduce((s,r)=>s+comisionRegistro(r),0);
    descargarReportePNG({
      titulo:`Comisión · ${nombre}`,
      subtitulo:nombreMes(mesCom),
      resumenLineas:[`Pacientes con comisión: ${lista.length}`,`Total: ${dinero(total)}`],
      columnas:[
        {titulo:'Fecha',peso:1,valor:r=>r.fecha||'-'},
        {titulo:'Paciente',peso:1.7,valor:r=>r.nombre||'SIN NOMBRE'},
        {titulo:'Clínica',peso:1.5,valor:r=>r.clinica||'SIN CLÍNICA'},
        {titulo:'Entrega',peso:1,valor:r=>r.tipoEntrega||'-'},
        {titulo:'Comisión',peso:1,valor:r=>dinero(comisionRegistro(r))},
      ],
      filas:lista,
      archivo:`comision-${nombreSeguro(nombre)}-${mesCom}.png`,
    });
  }

  function exportarRespaldo(){
    descargarTexto(`respaldo-imadent-${hoy()}.json`,JSON.stringify({version:7,fecha:hoy(),registros,clinicas},null,2));
  }
  function importarRespaldo(e){
    const file=e.target.files?.[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const data=JSON.parse(String(reader.result||''));
        if(Array.isArray(data.registros))setRegistros(data.registros);
        if(Array.isArray(data.clinicas))setClinicas(data.clinicas);
        alert('Respaldo restaurado.');
      }catch{alert('El archivo no es un respaldo válido.')}
      e.target.value='';
    };
    reader.readAsText(file);
  }

  const css=`
  *{box-sizing:border-box}
  :root{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#17313a;background:#eef3f5;color-scheme:light}
  body{margin:0;background:#eef3f5}
  button,input,select,textarea{font:inherit}
  input,select,textarea{width:100%;border:1px solid #cddce1;border-radius:12px;padding:12px 13px;background:#fff!important;color:#142f38!important;-webkit-text-fill-color:#142f38!important;caret-color:#087d87;outline:none}
  input::placeholder,textarea::placeholder{color:#8a9ca3!important;-webkit-text-fill-color:#8a9ca3!important;opacity:1}
  input:focus,select:focus,textarea:focus{border-color:#0b8791;box-shadow:0 0 0 3px rgba(11,135,145,.12)}
  label{display:block;font-size:12px;font-weight:800;color:#5a7078;margin:0 0 6px;text-transform:uppercase;letter-spacing:.03em}
  .app{max-width:1240px;margin:0 auto;min-height:100vh;background:#f8fbfc;box-shadow:0 0 30px rgba(30,60,70,.08)}
  .top{background:linear-gradient(135deg,#062f38,#0a5962);color:#fff;padding:25px 28px;display:flex;align-items:center;justify-content:space-between;gap:20px}
  .brand{font-size:30px;font-weight:900;letter-spacing:.08em}.brand small{display:block;font-size:12px;letter-spacing:0;font-weight:600;color:#c8e4e8;margin-top:5px}
  .date{background:rgba(255,255,255,.12);padding:10px 14px;border-radius:12px;font-weight:750}
  .nav{display:flex;gap:8px;flex-wrap:wrap;padding:15px 20px;background:#fff;border-bottom:1px solid #dce7ea;position:sticky;top:0;z-index:3}
  .nav button,.tab{border:1px solid #d8e4e8;background:#fff;color:#405861;padding:10px 13px;border-radius:11px;font-weight:800;cursor:pointer}
  .nav button.active,.tab.active{background:#087d87;color:#fff;border-color:#087d87}
  .main{padding:24px}.title{font-size:26px;font-weight:900;margin:0 0 5px}.sub{color:#698088;margin:0 0 20px}
  .card{background:#fff;border:1px solid #dce7ea;border-radius:17px;padding:18px;box-shadow:0 7px 20px rgba(34,73,84,.04);margin-bottom:18px}
  .card-title{font-size:17px;font-weight:900;margin-bottom:14px}
  .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .span2{grid-column:span 2}.span3{grid-column:span 3}
  .kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:18px}
  .kpi{background:#fff;border:1px solid #dce7ea;border-radius:15px;padding:16px}.kpi.accent{border-top:4px solid #0a8993}.kpi b{display:block;font-size:25px;margin-top:6px}.kpi span{font-size:11px;font-weight:900;color:#74878e;text-transform:uppercase}
  .btns{display:flex;gap:9px;flex-wrap:wrap}.btn{border:0;border-radius:11px;padding:11px 14px;font-weight:850;cursor:pointer}.primary{background:#087d87;color:#fff}.light{background:#eef5f6;color:#264850;border:1px solid #d4e4e7}.danger{background:#fff0f0;color:#a1333d;border:1px solid #f1c9cd}.success{background:#e8f7ef;color:#176640;border:1px solid #c7ead8}
  .seg{display:flex;gap:8px;flex-wrap:wrap}.seg button{border:1px solid #cfdfe3;background:#fff;color:#405861;padding:10px 13px;border-radius:10px;font-weight:800;cursor:pointer}.seg button.on{background:#087d87;color:#fff;border-color:#087d87}
  .notice{background:#eef8f8;border:1px solid #cde7e9;color:#315960;padding:11px 13px;border-radius:11px;font-size:13px}
  .table-wrap{overflow:auto;border:1px solid #dbe7ea;border-radius:13px}table{width:100%;border-collapse:collapse;min-width:850px}th{background:#edf5f6;color:#47616a;font-size:11px;text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:11px}td{padding:11px;border-top:1px solid #e4edef;font-size:13px;vertical-align:middle}tr:nth-child(even) td{background:#fbfdfd}
  .badge{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:11px;font-weight:900}.yes{background:#e4f7ed;color:#176640}.no{background:#f4f0f0;color:#77565a}.pending{background:#fff5dc;color:#8b650e}
  .row-actions{display:flex;gap:6px}.row-actions button{padding:7px 9px;border-radius:8px;border:1px solid #d6e3e7;background:#fff;cursor:pointer;font-weight:750}
  .admin-list{display:flex;gap:8px;flex-wrap:wrap}.chip{border:1px solid #d5e3e6;background:#f8fbfc;padding:9px 11px;border-radius:10px;cursor:pointer;font-weight:750}.chip.active{background:#087d87;color:#fff}
  @media(max-width:900px){.grid,.grid2{grid-template-columns:1fr}.span2,.span3{grid-column:auto}.kpis{grid-template-columns:repeat(2,1fr)}.main{padding:15px}.top{padding:20px}.nav{position:static}}
  `;

  const PatientTable=({lista,acciones=true})=>(
    <div className="table-wrap"><table><thead><tr>
      <th>Fecha</th><th>Paciente</th><th>Estudio</th><th>Clínica</th><th>Doctor</th><th>Precio</th><th>Pago</th><th>Comisión</th>{acciones&&<th>Acciones</th>}
    </tr></thead><tbody>
      {!lista.length?<tr><td colSpan={acciones?9:8} style={{textAlign:'center',color:'#7b8d93',padding:24}}>Sin registros</td></tr>:
      lista.map(r=><tr key={r.id}>
        <td>{r.fecha||'-'}</td><td><b>{r.nombre||'SIN NOMBRE'}</b></td><td>{r.estudio||'-'}</td><td>{r.clinica||'SIN CLÍNICA'}</td><td>{inferirDoctor(r,clinicas)}</td><td>{dinero(precioRegistro(r))}</td>
        <td>{r.estadoPago||'-'}</td>
        <td><span className={`badge ${generaComisionRegistro(r)?'yes':'no'}`}>{generaComisionRegistro(r)?dinero(comisionRegistro(r)):'NO'}</span></td>
        {acciones&&<td><div className="row-actions"><button onClick={()=>editar(r)}>Editar</button><button onClick={()=>borrar(r.id)}>Eliminar</button></div></td>}
      </tr>)}
    </tbody></table></div>
  );

  const Summary=({r})=><div className="kpis">
    <div className="kpi accent"><span>Pacientes</span><b>{r.pacientes}</b></div>
    <div className="kpi accent"><span>Ingresos</span><b>{dinero(r.ingresos)}</b></div>
    <div className="kpi accent"><span>Comisiones</span><b>{dinero(r.comisiones)}</b></div>
    <div className="kpi"><span>Cobrado</span><b>{dinero(r.cobrado)}</b></div>
    <div className="kpi"><span>Pendiente</span><b>{dinero(r.pendiente)}</b></div>
  </div>;

  return <><style>{css}</style><div className="app">
    <header className="top"><div className="brand">IMA DENT<small>Centro Radiológico Dental · Sistema administrativo</small></div><div className="date">{new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})}</div></header>
    <nav className="nav">
      {[["dashboard","📊 Panel"],["pacientes","👤 Pacientes"],["cortes","📷 Cortes"],["comisiones","💰 Comisiones"],["catalogo","⚙ Clínicas y doctores"],["respaldo","💾 Respaldo"]].map(([k,l])=><button key={k} className={seccion===k?'active':''} onClick={()=>setSeccion(k)}>{l}</button>)}
    </nav>

    <main className="main">
      {seccion==='dashboard'&&<>
        <h1 className="title">Panel de control</h1><p className="sub">Consulta rápidamente la semana, el mes o un historial mensual.</p>
        <div className="seg" style={{marginBottom:18}}>
          {['semana','mes','historial'].map(v=><button key={v} className={vistaDash===v?'on':''} onClick={()=>setVistaDash(v)}>{v==='semana'?'Esta semana':v==='mes'?'Este mes':'Historial del mes'}</button>)}
        </div>
        {vistaDash==='semana'&&<><div className="notice" style={{marginBottom:14}}>Semana: {etiquetaSemana(semanaActual)}</div><Summary r={resSemana}/><div className="card"><div className="card-title">Pacientes de esta semana</div><PatientTable lista={regsSemana} acciones={false}/></div></>}
        {vistaDash==='mes'&&<><div className="notice" style={{marginBottom:14}}>{nombreMes(mesActual())}</div><Summary r={resMes}/><div className="card"><div className="card-title">Pacientes del mes actual</div><PatientTable lista={regsMes} acciones={false}/></div></>}
        {vistaDash==='historial'&&<><div className="card"><div style={{maxWidth:360}}><label>Mes</label><select value={mesHist} onChange={e=>setMesHist(e.target.value)}>{mesesDisponibles.map(m=><option key={m} value={m}>{nombreMes(m)}</option>)}</select></div></div><Summary r={resHist}/><div className="card"><div className="card-title">Historial de {nombreMes(mesHist)}</div><PatientTable lista={regsHist} acciones={false}/></div></>}
      </>}

      {seccion==='pacientes'&&<>
        <h1 className="title">{editId!==null?'Modificar paciente':'Registrar paciente'}</h1>
        <p className="sub">Puedes guardar aunque dejes campos vacíos. El correo fue eliminado del sistema.</p>
        <div className="card">
          <div className="grid">
            <div><label>Fecha</label><input type="date" value={form.fecha} onChange={e=>setCampo('fecha',e.target.value)}/></div>
            <div><label>Nombre del paciente</label><input value={form.nombre} placeholder="Opcional" onChange={e=>setCampo('nombre',e.target.value)}/></div>
            <div><label>Teléfono</label><input value={form.telefono} placeholder="Opcional" onChange={e=>setCampo('telefono',e.target.value)}/></div>

            <div><label>Estudio</label><select value={form.estudio} onChange={e=>setCampo('estudio',e.target.value)}>{Object.keys(PRECIOS).map(x=><option key={x}>{x}</option>)}</select></div>
            <div><label>Precio</label><input value={dinero(PRECIOS[form.estudio]||0)} readOnly/></div>
            <div><label>Forma de pago</label><select value={form.tipoPago} onChange={e=>setCampo('tipoPago',e.target.value)}>{['Efectivo','Transferencia','Tarjeta','Otro'].map(x=><option key={x}>{x}</option>)}</select></div>

            <div><label>Estado de pago</label><select value={form.estadoPago} onChange={e=>setCampo('estadoPago',e.target.value)}><option>Pagado</option><option>Pendiente</option></select></div>
            <div><label>Clínica</label><select value={form.clinica} onChange={e=>{setCampo('clinica',e.target.value);setCampo('doctor','')}}><option value="">Sin clínica / externa</option>{clinicas.map(c=><option key={c.id||c.nombre} value={c.nombre}>{c.nombre}</option>)}</select></div>
            <div><label>Doctor</label><select value={form.doctor} onChange={e=>setCampo('doctor',e.target.value)}><option value="">Sin doctor</option>{doctoresForm.map(d=><option key={d} value={d}>{d}</option>)}</select></div>

            <div><label>Entrega</label><select value={form.tipoEntrega} onChange={e=>setCampo('tipoEntrega',e.target.value)}><option>Digital</option><option>Impresa</option></select></div>
            <div className="span2"><label>¿Genera comisión?</label><div className="seg"><button type="button" className={form.generaComision?'on':''} onClick={()=>setCampo('generaComision',true)}>Sí, dar comisión · {dinero(COMISIONES[form.tipoEntrega]||0)}</button><button type="button" className={!form.generaComision?'on':''} onClick={()=>setCampo('generaComision',false)}>No dar comisión</button></div></div>

            <div className="span3"><label>Observaciones</label><textarea rows={3} value={form.observaciones} placeholder="Opcional" onChange={e=>setCampo('observaciones',e.target.value)}/></div>
          </div>
          <div className="notice" style={{marginTop:14}}>Para pacientes de clínicas externas puedes dejar clínica y doctor vacíos y marcar <b>No dar comisión</b>.</div>
          <div className="btns" style={{marginTop:14}}><button className="btn primary" onClick={guardar}>{editId!==null?'Guardar cambios':'Guardar paciente'}</button>{editId!==null&&<button className="btn light" onClick={limpiar}>Cancelar edición</button>}</div>
        </div>

        <div className="card"><div className="card-title">Pacientes registrados</div>
          <div className="seg" style={{marginBottom:12}}>
            {[["hoy","Hoy"],["semana","Esta semana"],["mes","Este mes"],["pendiente","Pendientes"],["sincomision","Sin comisión"],["todos","Todos"]].map(([k,l])=><button key={k} className={filtro===k?'on':''} onClick={()=>setFiltro(k)}>{l}</button>)}
          </div>
          <div style={{maxWidth:430,marginBottom:12}}><input placeholder="Buscar paciente, clínica, doctor..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/></div>
          <PatientTable lista={registrosLista}/>
        </div>
      </>}

      {seccion==='cortes'&&<>
        <h1 className="title">Cortes semanales</h1><p className="sub">Selecciona una semana y descarga el corte listo para enviar al dueño.</p>
        <div className="card"><div className="grid2">
          <div><label>Semana</label><select value={semanaCorte} onChange={e=>setSemanaCorte(e.target.value)}>{semanasDisponibles.map(s=><option key={s} value={s}>{etiquetaSemana(s)}</option>)}</select></div>
          <div style={{display:'flex',alignItems:'end'}}><button className="btn primary" onClick={descargarCorte}>📷 Descargar corte en imagen PNG</button></div>
        </div></div>
        <Summary r={resCorte}/>
        <div className="card"><div className="card-title">Pacientes · {etiquetaSemana(semanaCorte)}</div><PatientTable lista={regsCorte} acciones={false}/></div>
      </>}

      {seccion==='comisiones'&&<>
        <h1 className="title">Comisiones mensuales</h1><p className="sub">Solo se incluyen pacientes marcados para dar comisión.</p>
        <div className="card"><div className="grid2"><div><label>Mes</label><select value={mesCom} onChange={e=>setMesCom(e.target.value)}>{mesesDisponibles.map(m=><option key={m} value={m}>{nombreMes(m)}</option>)}</select></div><div className="notice">Total del mes: <b>{dinero(totalComMes)}</b> · {regsCom.length} pacientes con comisión</div></div></div>

        <div className="card"><div className="card-title">Por clínica</div><div className="btns" style={{marginBottom:12}}><button className="btn primary" onClick={descargarResumenClinicas}>📷 Descargar todas las clínicas</button></div>
          <div className="table-wrap"><table><thead><tr><th>Clínica</th><th>Pacientes</th><th>Digital</th><th>Impresa</th><th>Total</th><th>Imagen</th></tr></thead><tbody>
            {!comClinicas.length?<tr><td colSpan={6}>Sin comisiones</td></tr>:comClinicas.map(r=><tr key={r.nombre}><td><b>{r.nombre}</b></td><td>{r.pacientes}</td><td>{dinero(r.digital)}</td><td>{dinero(r.impresa)}</td><td><b>{dinero(r.total)}</b></td><td><button className="btn light" onClick={()=>descargarClinica(r.nombre)}>Descargar PNG</button></td></tr>)}
          </tbody></table></div>
        </div>

        <div className="card"><div className="card-title">Por dentista</div><div className="btns" style={{marginBottom:12}}><button className="btn primary" onClick={descargarResumenDoctores}>📷 Descargar todos los dentistas</button></div>
          <div className="table-wrap"><table><thead><tr><th>Dentista</th><th>Pacientes</th><th>Total</th><th>Imagen</th></tr></thead><tbody>
            {!comDoctores.length?<tr><td colSpan={4}>Sin comisiones</td></tr>:comDoctores.map(r=><tr key={r.nombre}><td><b>{r.nombre}</b></td><td>{r.pacientes}</td><td><b>{dinero(r.total)}</b></td><td><button className="btn light" onClick={()=>descargarDoctor(r.nombre)}>Descargar PNG</button></td></tr>)}
          </tbody></table></div>
        </div>
      </>}

      {seccion==='catalogo'&&<>
        <h1 className="title">Clínicas y doctores</h1><p className="sub">Agrega o modifica nombres sin perder el historial.</p>
        <div className="card"><div className="card-title">Agregar clínica</div><div className="grid2"><input value={nuevaClinica} placeholder="Nombre de la clínica" onChange={e=>setNuevaClinica(e.target.value)}/><button className="btn primary" onClick={agregarClinica}>Agregar clínica</button></div></div>
        <div className="card"><div className="card-title">Seleccionar clínica</div><div className="admin-list">{clinicas.map(c=><button key={c.id||c.nombre} className={`chip ${clinicaAdmin===c.nombre?'active':''}`} onClick={()=>seleccionarClinicaAdmin(c.nombre)}>{c.nombre}</button>)}</div></div>

        {clinicaAdmin&&<>
          <div className="card"><div className="card-title">Modificar nombre de clínica</div><div className="grid2"><input value={nombreClinicaEdit} onChange={e=>setNombreClinicaEdit(e.target.value)}/><div className="btns"><button className="btn primary" onClick={renombrarClinica}>Guardar nombre</button><button className="btn danger" onClick={eliminarClinica}>Quitar del catálogo</button></div></div></div>
          <div className="card"><div className="card-title">Doctores de {clinicaAdmin}</div><div className="grid2" style={{marginBottom:14}}><input value={nuevoDoctor} placeholder="Nombre del doctor" onChange={e=>setNuevoDoctor(e.target.value)}/><button className="btn primary" onClick={agregarDoctor}>Agregar doctor</button></div>
            <div className="admin-list">{(clinicas.find(c=>c.nombre===clinicaAdmin)?.doctores||[]).map(d=><button key={d} className={`chip ${doctorAdmin===d?'active':''}`} onClick={()=>seleccionarDoctorAdmin(d)}>{d}</button>)}</div>
            {doctorAdmin&&<div className="grid2" style={{marginTop:14}}><input value={nombreDoctorEdit} onChange={e=>setNombreDoctorEdit(e.target.value)}/><div className="btns"><button className="btn primary" onClick={renombrarDoctor}>Guardar nombre</button><button className="btn danger" onClick={eliminarDoctor}>Quitar doctor</button></div></div>}
          </div>
        </>}
      </>}

      {seccion==='respaldo'&&<>
        <h1 className="title">Respaldo</h1><p className="sub">Tus datos continúan guardándose en este navegador. Descarga respaldos con frecuencia.</p>
        <div className="card"><div className="btns"><button className="btn primary" onClick={exportarRespaldo}>Descargar respaldo JSON</button><button className="btn light" onClick={()=>importRef.current?.click()}>Restaurar respaldo</button><input ref={importRef} type="file" accept=".json,application/json" style={{display:'none'}} onChange={importarRespaldo}/></div></div>
      </>}
    </main>
  </div></>;
}

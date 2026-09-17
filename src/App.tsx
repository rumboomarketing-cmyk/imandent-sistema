// IMADENT PRO · interfaz profesional + gestión completa
// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';

const PRECIOS = {
  'Panorámica': 350,
  'Lateral': 350,
  'Panorámica y Lateral': 700,
};

const COMISIONES = { Digital: 50, Impresa: 40 };
const SIN_CLINICA = 'CLÍNICA EXTERNA / NO APLICA';
const SIN_DOCTOR = 'NO APLICA';

const CLINICAS_BASE = [
  { id:'MILITARES', nombre:'MILITARES', doctores:['Dra. Paola Martínez','Dr. Xavier Zurita','Dr. Luis Flores','Dra. Itzel Ham','Dra. Aislin Cabrera','Dr. Pedro Bautista'] },
  { id:'PRODENTAL', nombre:'PRODENTAL', doctores:['Dra. Fátima Madrid','Dr. José Rodolfo','Dra. Melissa Baray','Dra. Itzel Ham','Dra. Fanny'] },
  { id:'CREANDO SONRISAS', nombre:'CREANDO SONRISAS', doctores:['Dr. Luis Flores'] },
  { id:'DENTALPRO', nombre:'DENTALPRO', doctores:['Dr. Elder Manuel','Dr. William'] },
  { id:'DENTAL EXPRESS', nombre:'DENTAL EXPRESS', doctores:[] },
  { id:'IMADENT', nombre:'IMADENT', doctores:['Dr. Mario Esquivel'] },
  { id:'SAN JOSÉ', nombre:'SAN JOSÉ', doctores:['Dr. José Rodolfo'] },
];

const FORM_BASE = {
  fecha:'', nombre:'', telefono:'', estudio:'Panorámica', tipoPago:'Efectivo', estadoPago:'Pagado',
  clinica:'', doctor:'', tipoEntrega:'Digital', generaComision:true, observaciones:''
};

const pad = n => String(n).padStart(2,'0');
const fechaLocal = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const hoy = () => fechaLocal(new Date());
const mesActual = () => hoy().slice(0,7);
const normalizar = (t='') => t.toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const slug = (t='reporte') => normalizar(t).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'reporte';
const dinero = n => Number(n||0).toLocaleString('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0});

function nombreMes(m){
  if(!m) return '';
  const [y,mo] = m.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric'}).format(new Date(y,mo-1,1));
}
function fechaLarga(fecha){
  if(!fecha) return '';
  return new Intl.DateTimeFormat('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${fecha}T12:00:00`));
}
function lunesDeFecha(fecha){
  if(!fecha) return '';
  const d=new Date(`${fecha}T00:00:00`), day=d.getDay();
  d.setDate(d.getDate()+(day===0?-6:1-day));
  return fechaLocal(d);
}
function finSemana(lunes){
  if(!lunes) return '';
  const d=new Date(`${lunes}T00:00:00`); d.setDate(d.getDate()+6); return fechaLocal(d);
}
const etiquetaSemana = lunes => `${lunes} al ${finSemana(lunes)}`;
const precioRegistro = r => Number(r?.precio ?? PRECIOS[r?.estudio] ?? 0);
const generaComisionRegistro = r => r?.generaComision !== false;
function comisionRegistro(r){
  if(!generaComisionRegistro(r)) return 0;
  if(r?.comision !== undefined && r?.comision !== null && r?.comision !== '') return Number(r.comision)||0;
  return Number(COMISIONES[r?.tipoEntrega]||0);
}
function doctorRegistro(r){ return (r?.doctor||'').trim() || SIN_DOCTOR; }
function clinicaRegistro(r){ return (r?.clinica||'').trim() || SIN_CLINICA; }
function resumen(lista){
  const pagos={Efectivo:0,Transferencia:0,Tarjeta:0,Otro:0};
  let ingresos=0,cobrado=0,pendiente=0,comisiones=0,conComision=0,sinComision=0;
  for(const r of lista){
    const p=precioRegistro(r); ingresos+=p; comisiones+=comisionRegistro(r);
    if(generaComisionRegistro(r)) conComision++; else sinComision++;
    if(r.estadoPago==='Pagado'){ cobrado+=p; const tipo=r.tipoPago||'Otro'; pagos[tipo]=(pagos[tipo]||0)+p; }
    else pendiente+=p;
  }
  return {pacientes:lista.length,ingresos,cobrado,pendiente,comisiones,conComision,sinComision,pagos};
}
function mergeCatalogo(guardado){
  if(!Array.isArray(guardado)||!guardado.length) return CLINICAS_BASE;
  const map = new Map(guardado.map(c=>[normalizar(c.nombre),{...c,doctores:Array.isArray(c.doctores)?c.doctores:[]}]))
  for(const base of CLINICAS_BASE){
    const key=normalizar(base.nombre), actual=map.get(key);
    if(!actual) map.set(key,{...base});
    else if(!actual.doctores.length) map.set(key,{...actual,doctores:[...base.doctores]});
  }
  return [...map.values()];
}
function descargarArchivo(nombre,texto,tipo='application/json'){
  const blob=new Blob([texto],{type:tipo}), url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url; a.download=nombre; a.click(); setTimeout(()=>URL.revokeObjectURL(url),500);
}
function cortar(ctx,text,max){
  let s=String(text??''); if(ctx.measureText(s).width<=max) return s;
  while(s.length>2&&ctx.measureText(s+'…').width>max) s=s.slice(0,-1);
  return s+'…';
}
function reportePNG({titulo,subtitulo,resumenLineas=[],columnas=[],filas=[],archivo='reporte.png'}){
  const width=1600, margin=72, headerH=225, rowH=52, lineH=42;
  const summaryH=resumenLineas.length?70+resumenLineas.length*lineH:0;
  const tableH=columnas.length?70+Math.max(1,filas.length)*rowH:0;
  const height=Math.max(820,headerH+margin+summaryH+tableH+120);
  const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height;
  const ctx=canvas.getContext('2d'); if(!ctx) return;
  ctx.fillStyle='#f5f8f9';ctx.fillRect(0,0,width,height);
  const grad=ctx.createLinearGradient(0,0,width,headerH);grad.addColorStop(0,'#073b45');grad.addColorStop(1,'#0b6770');ctx.fillStyle=grad;ctx.fillRect(0,0,width,headerH);
  ctx.fillStyle='#ffffff';ctx.font='700 56px Arial';ctx.fillText('IMADENT',margin,88);
  ctx.font='700 35px Arial';ctx.fillText(titulo,margin,148);
  ctx.fillStyle='#ccecef';ctx.font='24px Arial';ctx.fillText(subtitulo,margin,188);
  let y=headerH+52;
  if(resumenLineas.length){
    ctx.fillStyle='#fff';ctx.strokeStyle='#d7e5e8';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(margin,y,width-margin*2,summaryH,20);ctx.fill();ctx.stroke();
    ctx.fillStyle='#17353d';ctx.font='700 28px Arial';ctx.fillText('Resumen ejecutivo',margin+28,y+42);
    ctx.font='24px Arial';let sy=y+84;
    for(const line of resumenLineas){ctx.fillStyle='#38535b';ctx.fillText(line,margin+28,sy);sy+=lineH}
    y+=summaryH+28;
  }
  if(columnas.length){
    const totalW=width-margin*2,sum=columnas.reduce((a,c)=>a+(c.peso||1),0),ws=columnas.map(c=>totalW*(c.peso||1)/sum);
    ctx.fillStyle='#0c7c86';ctx.fillRect(margin,y,totalW,58);let x=margin;ctx.fillStyle='#fff';ctx.font='700 21px Arial';
    columnas.forEach((c,i)=>{ctx.fillText(cortar(ctx,c.titulo,ws[i]-18),x+9,y+37);x+=ws[i]});y+=58;ctx.font='20px Arial';
    if(!filas.length){ctx.fillStyle='#fff';ctx.fillRect(margin,y,totalW,rowH);ctx.fillStyle='#78888d';ctx.fillText('Sin registros',margin+14,y+34)}
    else filas.forEach((fila,ri)=>{ctx.fillStyle=ri%2?'#eef5f6':'#fff';ctx.fillRect(margin,y,totalW,rowH);let xx=margin;ctx.fillStyle='#253b42';columnas.forEach((c,i)=>{const val=typeof c.valor==='function'?c.valor(fila):fila[c.clave];ctx.fillText(cortar(ctx,val??'',ws[i]-18),xx+9,y+34);xx+=ws[i]});y+=rowH});
  }
  ctx.fillStyle='#74868c';ctx.font='20px Arial';ctx.fillText(`Generado ${new Date().toLocaleString('es-MX')}`,margin,height-38);
  const a=document.createElement('a');a.download=archivo;a.href=canvas.toDataURL('image/png',1);a.click();
}

const ICONS={dashboard:'▦',pacientes:'◉',comisiones:'$',cortes:'▤',clinicas:'✚',respaldo:'↧'};
const TITULOS={dashboard:'Panel de control',pacientes:'Pacientes',comisiones:'Comisiones',cortes:'Cortes semanales',clinicas:'Clínicas y doctores',respaldo:'Respaldo'};

export default function App(){
  const [seccion,setSeccion]=useState('dashboard');
  const [registros,setRegistros]=useState(()=>{try{return JSON.parse(localStorage.getItem('imadent_registros')||'[]')}catch{return[]}});
  const [clinicas,setClinicas]=useState(()=>{try{return mergeCatalogo(JSON.parse(localStorage.getItem('imadent_catalogo_clinicas')||'null'))}catch{return CLINICAS_BASE}});
  const [form,setForm]=useState({...FORM_BASE,fecha:hoy()});
  const [editId,setEditId]=useState(null);
  const [busqueda,setBusqueda]=useState('');
  const [filtro,setFiltro]=useState('semana');
  const [mesCom,setMesCom]=useState(mesActual());
  const [semanaCorte,setSemanaCorte]=useState(lunesDeFecha(hoy()));
  const [mesHist,setMesHist]=useState(mesActual());
  const [clinicaAdmin,setClinicaAdmin]=useState('');
  const [nuevaClinica,setNuevaClinica]=useState('');
  const [nuevoNombreClinica,setNuevoNombreClinica]=useState('');
  const [nuevoDoctor,setNuevoDoctor]=useState('');
  const [doctorAdmin,setDoctorAdmin]=useState('');
  const [nuevoNombreDoctor,setNuevoNombreDoctor]=useState('');
  const importRef=useRef(null);

  useEffect(()=>localStorage.setItem('imadent_registros',JSON.stringify(registros)),[registros]);
  useEffect(()=>localStorage.setItem('imadent_catalogo_clinicas',JSON.stringify(clinicas)),[clinicas]);

  const semanaActual=lunesDeFecha(hoy());
  const doctoresSeleccionados=useMemo(()=>clinicas.find(c=>c.nombre===form.clinica)?.doctores||[],[clinicas,form.clinica]);
  const semanas=useMemo(()=>{const s=new Set([semanaActual]);registros.forEach(r=>r.fecha&&s.add(lunesDeFecha(r.fecha)));return[...s].filter(Boolean).sort().reverse()},[registros,semanaActual]);
  const meses=useMemo(()=>{const s=new Set([mesActual()]);registros.forEach(r=>r.fecha&&s.add((r.fecha||'').slice(0,7)));return[...s].filter(Boolean).sort().reverse()},[registros]);
  const regsSemana=useMemo(()=>registros.filter(r=>r.fecha&&lunesDeFecha(r.fecha)===semanaActual),[registros,semanaActual]);
  const regsMes=useMemo(()=>registros.filter(r=>(r.fecha||'').slice(0,7)===mesActual()),[registros]);
  const resSemana=useMemo(()=>resumen(regsSemana),[regsSemana]);
  const resMes=useMemo(()=>resumen(regsMes),[regsMes]);
  const regsCorte=useMemo(()=>registros.filter(r=>r.fecha&&lunesDeFecha(r.fecha)===semanaCorte).sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||'')),[registros,semanaCorte]);
  const resCorte=useMemo(()=>resumen(regsCorte),[regsCorte]);
  const regsHist=useMemo(()=>registros.filter(r=>(r.fecha||'').slice(0,7)===mesHist).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')),[registros,mesHist]);
  const regsCom=useMemo(()=>registros.filter(r=>(r.fecha||'').slice(0,7)===mesCom&&comisionRegistro(r)>0),[registros,mesCom]);
  const comClinicas=useMemo(()=>{
    const map={}; for(const r of regsCom){const n=clinicaRegistro(r);if(!map[n])map[n]={nombre:n,pacientes:0,digital:0,impresa:0,total:0};const c=comisionRegistro(r);map[n].pacientes++;map[n].total+=c;if(r.tipoEntrega==='Impresa')map[n].impresa+=c;else map[n].digital+=c}return Object.values(map).sort((a,b)=>a.nombre.localeCompare(b.nombre));
  },[regsCom]);
  const comDoctores=useMemo(()=>{
    const map={};for(const r of regsCom){const n=doctorRegistro(r);if(!map[n])map[n]={nombre:n,pacientes:0,total:0,clinicas:{}};map[n].pacientes++;map[n].total+=comisionRegistro(r);const c=clinicaRegistro(r);map[n].clinicas[c]=(map[n].clinicas[c]||0)+comisionRegistro(r)}return Object.values(map).sort((a,b)=>a.nombre.localeCompare(b.nombre));
  },[regsCom]);
  const totalComMes=useMemo(()=>regsCom.reduce((s,r)=>s+comisionRegistro(r),0),[regsCom]);
  const listaPacientes=useMemo(()=>{
    let list=[...registros];
    if(filtro==='hoy')list=list.filter(r=>r.fecha===hoy());
    if(filtro==='semana')list=list.filter(r=>r.fecha&&lunesDeFecha(r.fecha)===semanaActual);
    if(filtro==='mes')list=list.filter(r=>(r.fecha||'').slice(0,7)===mesActual());
    if(filtro==='pendiente')list=list.filter(r=>r.estadoPago!=='Pagado');
    if(filtro==='sincomision')list=list.filter(r=>!generaComisionRegistro(r));
    if(busqueda.trim()){const q=normalizar(busqueda);list=list.filter(r=>[r.nombre,r.telefono,clinicaRegistro(r),doctorRegistro(r),r.estudio].some(v=>normalizar(v||'').includes(q)))}
    return list.sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')||Number(b.id||0)-Number(a.id||0));
  },[registros,filtro,busqueda,semanaActual]);

  const setCampo=(k,v)=>setForm(f=>({...f,[k]:v}));
  function limpiarForm(){setForm({...FORM_BASE,fecha:hoy()});setEditId(null)}
  function guardarPaciente(){
    const nombre=form.nombre.trim()||'SIN NOMBRE', clinica=form.clinica.trim(), doctor=form.doctor.trim();
    const base={...form,nombre,telefono:form.telefono.trim(),clinica,doctor,observaciones:form.observaciones.trim(),precio:PRECIOS[form.estudio]||0,comision:form.generaComision?(COMISIONES[form.tipoEntrega]||0):0};
    if(editId!==null) setRegistros(rs=>rs.map(r=>r.id===editId?{...r,...base}:r));
    else setRegistros(rs=>[{...base,id:Date.now(),folio:`IMA-${Date.now()}`},...rs]);
    if(clinica&&doctor){setClinicas(cs=>cs.map(c=>c.nombre===clinica&&!c.doctores.some(d=>normalizar(d)===normalizar(doctor))?{...c,doctores:[...c.doctores,doctor]}:c))}
    limpiarForm();
  }
  function editarPaciente(r){
    setEditId(r.id);setForm({fecha:r.fecha||hoy(),nombre:r.nombre==='SIN NOMBRE'?'':r.nombre||'',telefono:r.telefono||'',estudio:r.estudio||'Panorámica',tipoPago:r.tipoPago||'Efectivo',estadoPago:r.estadoPago||'Pagado',clinica:r.clinica||'',doctor:r.doctor||'',tipoEntrega:r.tipoEntrega||'Digital',generaComision:generaComisionRegistro(r),observaciones:r.observaciones||''});setSeccion('pacientes');window.scrollTo({top:0,behavior:'smooth'});
  }
  function eliminarPaciente(id){if(confirm('¿Eliminar este paciente?'))setRegistros(rs=>rs.filter(r=>r.id!==id))}
  function agregarClinica(){const n=nuevaClinica.trim();if(!n)return;if(clinicas.some(c=>normalizar(c.nombre)===normalizar(n))){alert('La clínica ya existe.');return}setClinicas(cs=>[...cs,{id:`${slug(n)}-${Date.now()}`,nombre:n,doctores:[]}]);setNuevaClinica('')}
  function seleccionarClinicaAdmin(n){setClinicaAdmin(n);setNuevoNombreClinica(n);setDoctorAdmin('');setNuevoNombreDoctor('')}
  function renombrarClinica(){const n=nuevoNombreClinica.trim();if(!clinicaAdmin||!n)return;setClinicas(cs=>cs.map(c=>c.nombre===clinicaAdmin?{...c,nombre:n}:c));setRegistros(rs=>rs.map(r=>r.clinica===clinicaAdmin?{...r,clinica:n}:r));setClinicaAdmin(n);alert('Clínica actualizada en catálogo e historial.')}
  function quitarClinica(){if(!clinicaAdmin||!confirm(`¿Quitar ${clinicaAdmin} del catálogo? El historial no se borrará.`))return;setClinicas(cs=>cs.filter(c=>c.nombre!==clinicaAdmin));setClinicaAdmin('')}
  function agregarDoctor(){const n=nuevoDoctor.trim();if(!clinicaAdmin||!n)return;setClinicas(cs=>cs.map(c=>c.nombre===clinicaAdmin&&!c.doctores.some(d=>normalizar(d)===normalizar(n))?{...c,doctores:[...c.doctores,n]}:c));setNuevoDoctor('')}
  function seleccionarDoctor(n){setDoctorAdmin(n);setNuevoNombreDoctor(n)}
  function renombrarDoctor(){const n=nuevoNombreDoctor.trim();if(!clinicaAdmin||!doctorAdmin||!n)return;setClinicas(cs=>cs.map(c=>c.nombre===clinicaAdmin?{...c,doctores:c.doctores.map(d=>d===doctorAdmin?n:d)}:c));setRegistros(rs=>rs.map(r=>r.clinica===clinicaAdmin&&r.doctor===doctorAdmin?{...r,doctor:n}:r));setDoctorAdmin(n);alert('Dentista actualizado en catálogo e historial.')}
  function quitarDoctor(){if(!clinicaAdmin||!doctorAdmin||!confirm(`¿Quitar a ${doctorAdmin} del catálogo?`))return;setClinicas(cs=>cs.map(c=>c.nombre===clinicaAdmin?{...c,doctores:c.doctores.filter(d=>d!==doctorAdmin)}:c));setDoctorAdmin('')}

  function descargarCorte(){
    reportePNG({titulo:'Corte semanal',subtitulo:etiquetaSemana(semanaCorte),resumenLineas:[`Pacientes: ${resCorte.pacientes}  •  Ingresos: ${dinero(resCorte.ingresos)}`,`Cobrado: ${dinero(resCorte.cobrado)}  •  Pendiente: ${dinero(resCorte.pendiente)}`,`Comisiones: ${dinero(resCorte.comisiones)}  •  Sin comisión: ${resCorte.sinComision}`],columnas:[{titulo:'Fecha',peso:1,valor:r=>r.fecha},{titulo:'Paciente',peso:2.1,valor:r=>r.nombre},{titulo:'Estudio',peso:1.7,valor:r=>r.estudio},{titulo:'Clínica',peso:1.8,valor:r=>clinicaRegistro(r)},{titulo:'Cobro',peso:1,valor:r=>dinero(precioRegistro(r))},{titulo:'Comisión',peso:1,valor:r=>dinero(comisionRegistro(r))}],filas:regsCorte,archivo:`corte-${semanaCorte}.png`});
  }
  function descargarComClinicas(){reportePNG({titulo:'Comisiones por clínica',subtitulo:nombreMes(mesCom),resumenLineas:[`Total mensual de comisiones: ${dinero(totalComMes)}`,`Clínicas con comisión: ${comClinicas.length}`],columnas:[{titulo:'Clínica',peso:2.5,clave:'nombre'},{titulo:'Pacientes',peso:1,clave:'pacientes'},{titulo:'Digital',peso:1,valor:r=>dinero(r.digital)},{titulo:'Impresa',peso:1,valor:r=>dinero(r.impresa)},{titulo:'Total',peso:1.2,valor:r=>dinero(r.total)}],filas:comClinicas,archivo:`comisiones-clinicas-${mesCom}.png`})}
  function descargarComDoctores(){reportePNG({titulo:'Comisiones por dentista',subtitulo:nombreMes(mesCom),resumenLineas:[`Total mensual de comisiones: ${dinero(totalComMes)}`,`Dentistas con comisión: ${comDoctores.length}`],columnas:[{titulo:'Dentista',peso:2.7,clave:'nombre'},{titulo:'Pacientes',peso:1,clave:'pacientes'},{titulo:'Clínicas',peso:2.4,valor:r=>Object.keys(r.clinicas).join(', ')},{titulo:'Total',peso:1.2,valor:r=>dinero(r.total)}],filas:comDoctores,archivo:`comisiones-dentistas-${mesCom}.png`})}
  function descargarClinicaIndividual(c){reportePNG({titulo:`Comisión · ${c.nombre}`,subtitulo:nombreMes(mesCom),resumenLineas:[`Pacientes con comisión: ${c.pacientes}`,`Digital: ${dinero(c.digital)}  •  Impresa: ${dinero(c.impresa)}`,`Total a pagar: ${dinero(c.total)}`],archivo:`comision-${slug(c.nombre)}-${mesCom}.png`})}
  function descargarDoctorIndividual(d){reportePNG({titulo:`Comisión · ${d.nombre}`,subtitulo:nombreMes(mesCom),resumenLineas:[`Pacientes con comisión: ${d.pacientes}`,`Clínicas: ${Object.keys(d.clinicas).join(', ')||'—'}`,`Total a pagar: ${dinero(d.total)}`],archivo:`comision-${slug(d.nombre)}-${mesCom}.png`})}
  function exportar(){descargarArchivo(`imadent-respaldo-${hoy()}.json`,JSON.stringify({version:2,fecha:new Date().toISOString(),registros,clinicas},null,2))}
  function importar(file){if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const d=JSON.parse(String(reader.result||''));if(Array.isArray(d.registros))setRegistros(d.registros);if(Array.isArray(d.clinicas))setClinicas(mergeCatalogo(d.clinicas));alert('Respaldo restaurado correctamente.')}catch{alert('No se pudo leer el respaldo.')}};reader.readAsText(file)}

  const stats=[['Pacientes',resSemana.pacientes,'Esta semana'],['Ingresos',dinero(resSemana.ingresos),'Facturación semanal'],['Cobrado',dinero(resSemana.cobrado),'Pagos recibidos'],['Pendiente',dinero(resSemana.pendiente),'Por cobrar'],['Comisiones',dinero(resSemana.comisiones),'Semana actual']];

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">IM</div><div><strong>IMADENT</strong><span>Centro Radiológico Dental</span></div></div>
      <nav className="nav-list">{Object.keys(TITULOS).map(k=><button key={k} className={`nav-item ${seccion===k?'active':''}`} onClick={()=>setSeccion(k)}><span className="nav-icon">{ICONS[k]}</span><span>{TITULOS[k]}</span></button>)}</nav>
      <div className="sidebar-foot"><span className="status-dot"/>Sistema activo<div>{fechaLarga(hoy())}</div></div>
    </aside>

    <div className="workspace">
      <header className="topbar"><div><p className="eyebrow">IMADENT · Gestión interna</p><h1>{TITULOS[seccion]}</h1></div><div className="top-actions"><span className="date-pill">{fechaLarga(hoy())}</span>{seccion==='pacientes'&&<button className="btn primary" onClick={()=>{limpiarForm();window.scrollTo({top:0,behavior:'smooth'})}}>+ Nuevo paciente</button>}</div></header>
      <main className="content">

        {seccion==='dashboard'&&<>
          <section className="hero-card"><div><span className="hero-kicker">Resumen operativo</span><h2>Todo el centro, en una sola vista.</h2><p>Control semanal de pacientes, ingresos, pagos y comisiones.</p></div><div className="hero-week"><span>Semana actual</span><strong>{etiquetaSemana(semanaActual)}</strong></div></section>
          <section className="stats-grid">{stats.map(([a,b,c],i)=><article className={`stat-card stat-${i}`} key={a}><div className="stat-top"><span>{a}</span><span className="stat-dot">•</span></div><strong>{b}</strong><small>{c}</small></article>)}</section>
          <section className="grid-2"><article className="panel"><div className="panel-head"><div><p className="eyebrow">Actividad reciente</p><h2>Pacientes de esta semana</h2></div><button className="btn ghost" onClick={()=>setSeccion('pacientes')}>Ver todos</button></div><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Paciente</th><th>Estudio</th><th>Clínica</th><th>Total</th></tr></thead><tbody>{regsSemana.slice(0,7).map(r=><tr key={r.id}><td>{r.fecha}</td><td className="strong">{r.nombre}</td><td>{r.estudio}</td><td>{clinicaRegistro(r)}</td><td>{dinero(precioRegistro(r))}</td></tr>)}{!regsSemana.length&&<tr><td colSpan="5" className="empty">No hay pacientes esta semana.</td></tr>}</tbody></table></div></article>
          <article className="panel"><div className="panel-head"><div><p className="eyebrow">Mes actual</p><h2>{nombreMes(mesActual())}</h2></div></div><div className="mini-summary"><div><span>Pacientes</span><strong>{resMes.pacientes}</strong></div><div><span>Ingresos</span><strong>{dinero(resMes.ingresos)}</strong></div><div><span>Comisiones</span><strong>{dinero(resMes.comisiones)}</strong></div><div><span>Pendiente</span><strong>{dinero(resMes.pendiente)}</strong></div></div><div className="quick-actions"><button className="quick" onClick={()=>setSeccion('cortes')}><span>▤</span><div><b>Generar corte</b><small>Descargar semana en PNG</small></div></button><button className="quick" onClick={()=>setSeccion('comisiones')}><span>$</span><div><b>Ver comisiones</b><small>Clínicas y dentistas</small></div></button></div></article></section>
        </>}

        {seccion==='pacientes'&&<>
          <section className="panel form-panel"><div className="panel-head"><div><p className="eyebrow">{editId!==null?'Editando registro':'Nuevo registro'}</p><h2>{editId!==null?'Modificar paciente':'Registrar paciente'}</h2></div>{editId!==null&&<button className="btn ghost" onClick={limpiarForm}>Cancelar edición</button>}</div>
            <div className="form-grid">
              <label className="field"><span>Fecha</span><input type="date" value={form.fecha} onChange={e=>setCampo('fecha',e.target.value)}/></label>
              <label className="field span-2"><span>Nombre del paciente</span><input value={form.nombre} onChange={e=>setCampo('nombre',e.target.value)} placeholder="Nombre completo (opcional)"/></label>
              <label className="field"><span>Teléfono</span><input value={form.telefono} onChange={e=>setCampo('telefono',e.target.value)} placeholder="Opcional"/></label>
              <label className="field"><span>Estudio</span><select value={form.estudio} onChange={e=>setCampo('estudio',e.target.value)}>{Object.keys(PRECIOS).map(x=><option key={x}>{x}</option>)}</select></label>
              <label className="field"><span>Forma de pago</span><select value={form.tipoPago} onChange={e=>setCampo('tipoPago',e.target.value)}><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option><option>Otro</option></select></label>
              <label className="field"><span>Estado</span><select value={form.estadoPago} onChange={e=>setCampo('estadoPago',e.target.value)}><option>Pagado</option><option>Pendiente</option></select></label>
              <label className="field"><span>Clínica</span><select value={form.clinica} onChange={e=>{setCampo('clinica',e.target.value);setCampo('doctor','')}}><option value="">Clínica externa / No aplica</option>{clinicas.map(c=><option key={c.id||c.nombre} value={c.nombre}>{c.nombre}</option>)}</select></label>
              <label className="field"><span>Doctor / Dentista</span><input list="doctores-sugeridos" value={form.doctor} onChange={e=>setCampo('doctor',e.target.value)} placeholder={form.clinica?'Selecciona o escribe otro':'Opcional'}/><datalist id="doctores-sugeridos">{doctoresSeleccionados.map(d=><option key={d} value={d}/>)}</datalist>{form.clinica&&doctoresSeleccionados.length>0&&<small className="field-help">Escribe para ver opciones de esta clínica.</small>}</label>
              <label className="field"><span>Entrega</span><select value={form.tipoEntrega} onChange={e=>setCampo('tipoEntrega',e.target.value)}><option>Digital</option><option>Impresa</option></select></label>
              <label className="field"><span>¿Genera comisión?</span><select value={form.generaComision?'si':'no'} onChange={e=>setCampo('generaComision',e.target.value==='si')}><option value="si">Sí · dar comisión</option><option value="no">No · sin comisión</option></select></label>
              <label className="field span-2"><span>Observaciones</span><textarea value={form.observaciones} onChange={e=>setCampo('observaciones',e.target.value)} placeholder="Notas opcionales" rows="3"/></label>
            </div>
            <div className="form-footer"><div className="price-preview"><span>Precio del estudio</span><strong>{dinero(PRECIOS[form.estudio])}</strong><small>{form.generaComision?`Comisión: ${dinero(COMISIONES[form.tipoEntrega])}`:'Sin comisión'}</small></div><button className="btn primary big" onClick={guardarPaciente}>{editId!==null?'Guardar cambios':'Guardar paciente'}</button></div>
          </section>

          <section className="panel"><div className="panel-head stack-mobile"><div><p className="eyebrow">Historial</p><h2>Pacientes registrados</h2></div><div className="search-box"><span>⌕</span><input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar paciente, clínica o doctor"/></div></div><div className="filter-row">{[['hoy','Hoy'],['semana','Esta semana'],['mes','Este mes'],['pendiente','Pendientes'],['sincomision','Sin comisión'],['todos','Todos']].map(([v,l])=><button key={v} className={`chip ${filtro===v?'active':''}`} onClick={()=>setFiltro(v)}>{l}</button>)}</div><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Paciente</th><th>Estudio</th><th>Clínica</th><th>Doctor</th><th>Estado</th><th>Comisión</th><th></th></tr></thead><tbody>{listaPacientes.map(r=><tr key={r.id}><td>{r.fecha||'—'}</td><td className="strong">{r.nombre||'SIN NOMBRE'}</td><td>{r.estudio}</td><td>{clinicaRegistro(r)}</td><td>{doctorRegistro(r)}</td><td><span className={`badge ${r.estadoPago==='Pagado'?'ok':'warn'}`}>{r.estadoPago||'Pendiente'}</span></td><td>{generaComisionRegistro(r)?dinero(comisionRegistro(r)):<span className="badge neutral">No</span>}</td><td><div className="row-actions"><button onClick={()=>editarPaciente(r)}>Editar</button><button className="danger-link" onClick={()=>eliminarPaciente(r.id)}>Eliminar</button></div></td></tr>)}{!listaPacientes.length&&<tr><td colSpan="8" className="empty">No hay registros para este filtro.</td></tr>}</tbody></table></div></section>
        </>}

        {seccion==='comisiones'&&<>
          <section className="toolbar-card"><div><p className="eyebrow">Periodo</p><h2>Comisiones mensuales</h2></div><label className="compact-field"><span>Mes</span><select value={mesCom} onChange={e=>setMesCom(e.target.value)}>{meses.map(m=><option key={m} value={m}>{nombreMes(m)}</option>)}</select></label><div className="toolbar-total"><span>Total del mes</span><strong>{dinero(totalComMes)}</strong></div></section>
          <section className="grid-2"><article className="panel"><div className="panel-head"><div><p className="eyebrow">Por clínica</p><h2>Resumen de clínicas</h2></div><button className="btn secondary" onClick={descargarComClinicas}>Descargar PNG</button></div><div className="cards-list">{comClinicas.map(c=><div className="commission-card" key={c.nombre}><div><b>{c.nombre}</b><small>{c.pacientes} pacientes · Digital {dinero(c.digital)} · Impresa {dinero(c.impresa)}</small></div><div className="commission-amount"><strong>{dinero(c.total)}</strong><button onClick={()=>descargarClinicaIndividual(c)}>PNG</button></div></div>)}{!comClinicas.length&&<div className="empty-card">Sin comisiones para este mes.</div>}</div></article>
          <article className="panel"><div className="panel-head"><div><p className="eyebrow">Por dentista</p><h2>Resumen de dentistas</h2></div><button className="btn secondary" onClick={descargarComDoctores}>Descargar PNG</button></div><div className="cards-list">{comDoctores.map(d=><div className="commission-card" key={d.nombre}><div><b>{d.nombre}</b><small>{d.pacientes} pacientes · {Object.keys(d.clinicas).join(', ')}</small></div><div className="commission-amount"><strong>{dinero(d.total)}</strong><button onClick={()=>descargarDoctorIndividual(d)}>PNG</button></div></div>)}{!comDoctores.length&&<div className="empty-card">Sin comisiones para este mes.</div>}</div></article></section>
        </>}

        {seccion==='cortes'&&<>
          <section className="toolbar-card"><div><p className="eyebrow">Reporte para dirección</p><h2>Corte semanal</h2></div><label className="compact-field"><span>Semana</span><select value={semanaCorte} onChange={e=>setSemanaCorte(e.target.value)}>{semanas.map(s=><option key={s} value={s}>{etiquetaSemana(s)}</option>)}</select></label><button className="btn primary" onClick={descargarCorte}>Descargar corte PNG</button></section>
          <section className="stats-grid cut-stats">{[['Pacientes',resCorte.pacientes],['Ingresos',dinero(resCorte.ingresos)],['Cobrado',dinero(resCorte.cobrado)],['Pendiente',dinero(resCorte.pendiente)],['Comisiones',dinero(resCorte.comisiones)]].map(([a,b])=><article className="stat-card" key={a}><span>{a}</span><strong>{b}</strong></article>)}</section>
          <section className="panel"><div className="panel-head"><div><p className="eyebrow">Detalle</p><h2>{etiquetaSemana(semanaCorte)}</h2></div></div><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Paciente</th><th>Estudio</th><th>Clínica</th><th>Doctor</th><th>Total</th><th>Comisión</th></tr></thead><tbody>{regsCorte.map(r=><tr key={r.id}><td>{r.fecha}</td><td className="strong">{r.nombre}</td><td>{r.estudio}</td><td>{clinicaRegistro(r)}</td><td>{doctorRegistro(r)}</td><td>{dinero(precioRegistro(r))}</td><td>{dinero(comisionRegistro(r))}</td></tr>)}{!regsCorte.length&&<tr><td colSpan="7" className="empty">No hay registros en esta semana.</td></tr>}</tbody></table></div></section>
        </>}

        {seccion==='clinicas'&&<>
          <section className="grid-2"><article className="panel"><div className="panel-head"><div><p className="eyebrow">Catálogo</p><h2>Agregar clínica</h2></div></div><div className="inline-form"><input value={nuevaClinica} onChange={e=>setNuevaClinica(e.target.value)} placeholder="Nombre de nueva clínica"/><button className="btn primary" onClick={agregarClinica}>Agregar</button></div><div className="clinic-list">{clinicas.map(c=><button key={c.id||c.nombre} className={`clinic-row ${clinicaAdmin===c.nombre?'active':''}`} onClick={()=>seleccionarClinicaAdmin(c.nombre)}><div><b>{c.nombre}</b><small>{c.doctores.length} dentistas</small></div><span>›</span></button>)}</div></article>
          <article className="panel"><div className="panel-head"><div><p className="eyebrow">Administrar</p><h2>{clinicaAdmin||'Selecciona una clínica'}</h2></div></div>{clinicaAdmin?<><label className="field"><span>Nombre de la clínica</span><input value={nuevoNombreClinica} onChange={e=>setNuevoNombreClinica(e.target.value)}/></label><div className="button-row"><button className="btn secondary" onClick={renombrarClinica}>Guardar nombre</button><button className="btn danger" onClick={quitarClinica}>Quitar del catálogo</button></div><hr className="divider"/><h3>Dentistas</h3><div className="inline-form"><input value={nuevoDoctor} onChange={e=>setNuevoDoctor(e.target.value)} placeholder="Agregar dentista"/><button className="btn primary" onClick={agregarDoctor}>Agregar</button></div><div className="doctor-list">{(clinicas.find(c=>c.nombre===clinicaAdmin)?.doctores||[]).map(d=><button key={d} className={`doctor-chip ${doctorAdmin===d?'active':''}`} onClick={()=>seleccionarDoctor(d)}>{d}</button>)}</div>{doctorAdmin&&<div className="edit-doctor"><label className="field"><span>Modificar nombre</span><input value={nuevoNombreDoctor} onChange={e=>setNuevoNombreDoctor(e.target.value)}/></label><div className="button-row"><button className="btn secondary" onClick={renombrarDoctor}>Guardar</button><button className="btn danger" onClick={quitarDoctor}>Quitar</button></div></div>}</>:<div className="empty-card">Selecciona una clínica de la lista para editarla.</div>}</article></section>
        </>}

        {seccion==='respaldo'&&<>
          <section className="grid-2"><article className="panel"><div className="panel-head"><div><p className="eyebrow">Seguridad</p><h2>Respaldo de información</h2></div></div><p className="muted">Descarga una copia antes de cambiar de computadora, navegador o hacer modificaciones importantes.</p><div className="backup-actions"><button className="btn primary big" onClick={exportar}>Descargar respaldo JSON</button><button className="btn secondary big" onClick={()=>importRef.current?.click()}>Restaurar respaldo</button><input ref={importRef} type="file" accept="application/json" style={{display:'none'}} onChange={e=>importar(e.target.files?.[0])}/></div><div className="notice"><b>Importante:</b> los registros siguen usando la clave original <code>imadent_registros</code>, por lo que tu historial actual se conserva.</div></article>
          <article className="panel"><div className="panel-head"><div><p className="eyebrow">Consulta</p><h2>Historial mensual</h2></div><label className="compact-field"><span>Mes</span><select value={mesHist} onChange={e=>setMesHist(e.target.value)}>{meses.map(m=><option key={m} value={m}>{nombreMes(m)}</option>)}</select></label></div><div className="mini-summary"><div><span>Pacientes</span><strong>{regsHist.length}</strong></div><div><span>Ingresos</span><strong>{dinero(resumen(regsHist).ingresos)}</strong></div><div><span>Comisiones</span><strong>{dinero(resumen(regsHist).comisiones)}</strong></div></div></article></section>
          <section className="panel"><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Paciente</th><th>Estudio</th><th>Clínica</th><th>Doctor</th><th>Precio</th></tr></thead><tbody>{regsHist.map(r=><tr key={r.id}><td>{r.fecha}</td><td className="strong">{r.nombre}</td><td>{r.estudio}</td><td>{clinicaRegistro(r)}</td><td>{doctorRegistro(r)}</td><td>{dinero(precioRegistro(r))}</td></tr>)}{!regsHist.length&&<tr><td colSpan="6" className="empty">Sin registros en este mes.</td></tr>}</tbody></table></div></section>
        </>}

      </main>
    </div>
  </div>;
}

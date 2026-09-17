// IMADENT v5 · Semana + historial mensual + corte diario
// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';

const PRECIOS = { Panorámica: 350, Lateral: 350, 'Panorámica y Lateral': 700 };
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
const FORM = { fecha:'', nombre:'', telefono:'', correo:'', estudio:'Panorámica', tipoPago:'Efectivo', estadoPago:'Pagado', clinica:'', doctor:'', tipoEntrega:'Digital', observaciones:'' };

const hoy = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const mesHoy = () => hoy().slice(0,7);
const dinero = n => Number(n||0).toLocaleString('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0});
const normalizar = (s='') => s.toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const mesDe = f => (f||'').slice(0,7);
const nombreMes = m => { if(!m) return ''; const [y,mo]=m.split('-').map(Number); return new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric'}).format(new Date(y,mo-1,1)); };
const fechaTxt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const rangoSemana = (base=new Date()) => { const d=new Date(base.getFullYear(),base.getMonth(),base.getDate()); const n=d.getDay(); const lunes=new Date(d); lunes.setDate(d.getDate()+(n===0?-6:1-n)); const domingo=new Date(lunes); domingo.setDate(lunes.getDate()+6); return {inicio:fechaTxt(lunes),fin:fechaTxt(domingo)}; };
const rangoMes = m => { const [y,mo]=m.split('-').map(Number); return {inicio:`${m}-01`,fin:`${m}-${String(new Date(y,mo,0).getDate()).padStart(2,'0')}`}; };
const comision = r => r.comision!=null ? Number(r.comision||0) : Number(COMISIONES[r.tipoEntrega]||0);
const doctorRegistro = (r,catalogo) => {
  if((r.doctor||'').trim()) return r.doctor.trim();
  const obs=(r.observaciones||'').trim(), no=normalizar(obs); if(!obs) return 'SIN DOCTOR';
  for(const c of catalogo) for(const d of (c.doctores||[])){ const nd=normalizar(d), corto=nd.replace('dra. ','').replace('dr. ',''); if(no.includes(nd)||no.includes(corto)) return d; }
  return obs.length<=50 && obs.split(/\s+/).length<=6 ? obs : 'SIN DOCTOR';
};
const resumen = lista => ({
  pacientes: lista.length,
  ingresos: lista.reduce((a,r)=>a+Number(r.precio||0),0),
  comisiones: lista.reduce((a,r)=>a+comision(r),0),
  cobrado: lista.filter(r=>r.estadoPago==='Pagado').reduce((a,r)=>a+Number(r.precio||0),0),
  pendiente: lista.filter(r=>r.estadoPago==='Pendiente').reduce((a,r)=>a+Number(r.precio||0),0),
  panoramicas: lista.filter(r=>r.estudio==='Panorámica').length,
  laterales: lista.filter(r=>r.estudio==='Lateral').length,
  ambos: lista.filter(r=>r.estudio==='Panorámica y Lateral').length,
});

function descargarPngDoctor(item, mes){
  const c=document.createElement('canvas'); c.width=1200; c.height=700; const x=c.getContext('2d');
  x.fillStyle='#f4f8f9'; x.fillRect(0,0,c.width,c.height); x.fillStyle='#12333b'; x.font='bold 48px Arial'; x.fillText('IMA DENT',70,90);
  x.font='28px Arial'; x.fillStyle='#45636b'; x.fillText('Reporte de comisiones',70,135); x.fillText(nombreMes(mes),70,175);
  x.fillStyle='#fff'; x.fillRect(60,220,1080,390); x.fillStyle='#17343b'; x.font='bold 38px Arial'; x.fillText(item.doctor,95,285);
  x.font='26px Arial'; x.fillStyle='#52686f'; x.fillText(item.clinica,95,330);
  x.fillText(`Pacientes: ${item.pacientes}`,95,400); x.fillText(`Digitales: ${item.digitales}`,95,450); x.fillText(`Impresas: ${item.impresas}`,95,500);
  x.font='bold 34px Arial'; x.fillStyle='#087d87'; x.fillText(`TOTAL A PAGAR: ${dinero(item.total)}`,95,570);
  const a=document.createElement('a'); a.href=c.toDataURL('image/png'); a.download=`comision-${item.doctor.replace(/[^a-z0-9]+/gi,'-')}-${mes}.png`; a.click();
}

export default function App(){
  const [seccion,setSeccion]=useState('dashboard');
  const [registros,setRegistros]=useState(()=>{try{return JSON.parse(localStorage.getItem('imadent_registros')||'[]')}catch{return[]}});
  const [catalogo,setCatalogo]=useState(()=>{try{return JSON.parse(localStorage.getItem('imadent_catalogo_clinicas')||'null')||CLINICAS_BASE}catch{return CLINICAS_BASE}});
  const [form,setForm]=useState({...FORM,fecha:hoy()}); const [editId,setEditId]=useState(null);
  const [busqueda,setBusqueda]=useState(''); const [fClinica,setFClinica]=useState(''); const [fDesde,setFDesde]=useState(''); const [fHasta,setFHasta]=useState(''); const [fEstado,setFEstado]=useState('');
  const [vista,setVista]=useState('semana'); const [mesHistorial,setMesHistorial]=useState(mesHoy());
  const [mesCom,setMesCom]=useState(mesHoy()); const [clinicaCom,setClinicaCom]=useState('TODAS'); const [doctorCom,setDoctorCom]=useState('TODOS');
  const [nuevaClinica,setNuevaClinica]=useState(''); const [clinicaAdmin,setClinicaAdmin]=useState(''); const [nuevoDoctor,setNuevoDoctor]=useState('');

  useEffect(()=>localStorage.setItem('imadent_registros',JSON.stringify(registros)),[registros]);
  useEffect(()=>localStorage.setItem('imadent_catalogo_clinicas',JSON.stringify(catalogo)),[catalogo]);

  const semana=rangoSemana(); const mesActual=mesHoy();
  const meses=useMemo(()=>Array.from(new Set([...registros.map(r=>mesDe(r.fecha)).filter(Boolean),mesActual])).sort().reverse(),[registros,mesActual]);
  const listaSemana=useMemo(()=>registros.filter(r=>r.fecha>=semana.inicio&&r.fecha<=semana.fin).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')),[registros,semana.inicio,semana.fin]);
  const listaMes=useMemo(()=>registros.filter(r=>mesDe(r.fecha)===mesActual).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')),[registros,mesActual]);
  const listaHist=useMemo(()=>registros.filter(r=>mesDe(r.fecha)===mesHistorial).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')),[registros,mesHistorial]);
  const listaHoy=useMemo(()=>registros.filter(r=>r.fecha===hoy()),[registros]);
  const rSemana=resumen(listaSemana), rMes=resumen(listaMes), rHist=resumen(listaHist), rHoy=resumen(listaHoy);

  const pacientesVisibles=useMemo(()=>registros.filter(r=>{
    const q=normalizar(busqueda); const texto=normalizar(`${r.nombre} ${r.telefono} ${r.clinica} ${doctorRegistro(r,catalogo)} ${r.folio||''}`);
    return (!q||texto.includes(q))&&(!fClinica||r.clinica===fClinica)&&(!fDesde||r.fecha>=fDesde)&&(!fHasta||r.fecha<=fHasta)&&(!fEstado||r.estadoPago===fEstado);
  }).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')),[registros,busqueda,fClinica,fDesde,fHasta,fEstado,catalogo]);

  const comFiltradas=useMemo(()=>registros.filter(r=>(mesCom==='TODOS'||mesDe(r.fecha)===mesCom)&&(clinicaCom==='TODAS'||r.clinica===clinicaCom)),[registros,mesCom,clinicaCom]);
  const gruposCom=useMemo(()=>{
    const m={}; for(const r of comFiltradas){ const d=doctorRegistro(r,catalogo); if(doctorCom!=='TODOS'&&d!==doctorCom) continue; const k=`${r.clinica||'SIN CLÍNICA'}|||${d}`; if(!m[k])m[k]={clinica:r.clinica||'SIN CLÍNICA',doctor:d,pacientes:0,digitales:0,impresas:0,total:0,ingresos:0}; const g=m[k]; g.pacientes++; g.total+=comision(r); g.ingresos+=Number(r.precio||0); if(r.tipoEntrega==='Digital')g.digitales++; if(r.tipoEntrega==='Impresa')g.impresas++; }
    return Object.values(m).sort((a,b)=>a.clinica.localeCompare(b.clinica)||a.doctor.localeCompare(b.doctor));
  },[comFiltradas,catalogo,doctorCom]);
  const doctoresCom=useMemo(()=>Array.from(new Set(comFiltradas.map(r=>doctorRegistro(r,catalogo)))).sort(),[comFiltradas,catalogo]);
  const doctoresForm=(catalogo.find(c=>c.nombre===form.clinica)?.doctores)||[];

  const setCampo=(k,v)=>setForm(p=>({...p,[k]:v}));
  const limpiar=()=>{setForm({...FORM,fecha:hoy()});setEditId(null)};
  const guardar=()=>{
    if(!form.fecha||!form.nombre.trim()||!form.clinica||!form.doctor){alert('Completa fecha, paciente, clínica y doctor.');return;}
    const data={...form,nombre:form.nombre.trim(),telefono:form.telefono.trim(),correo:form.correo.trim(),observaciones:form.observaciones.trim(),precio:PRECIOS[form.estudio]||0,comision:COMISIONES[form.tipoEntrega]||0};
    if(editId){setRegistros(p=>p.map(r=>r.id===editId?{...r,...data}:r));} else {setRegistros(p=>[{...data,id:Date.now(),folio:`IMA-${Date.now()}`},...p]);}
    limpiar();
  };
  const editar=r=>{setForm({fecha:r.fecha||hoy(),nombre:r.nombre||'',telefono:r.telefono||'',correo:r.correo||'',estudio:r.estudio||'Panorámica',tipoPago:r.tipoPago||'Efectivo',estadoPago:r.estadoPago||'Pagado',clinica:r.clinica||'',doctor:doctorRegistro(r,catalogo)==='SIN DOCTOR'?'':doctorRegistro(r,catalogo),tipoEntrega:r.tipoEntrega||'Digital',observaciones:r.observaciones||''});setEditId(r.id);setSeccion('pacientes');window.scrollTo({top:0,behavior:'smooth'});};
  const eliminar=id=>{if(confirm('¿Eliminar este paciente?'))setRegistros(p=>p.filter(r=>r.id!==id));};
  const filtroRapido=t=>{setBusqueda('');setFClinica('');setFEstado(''); if(t==='hoy'){setFDesde(hoy());setFHasta(hoy())} else if(t==='semana'){setFDesde(semana.inicio);setFHasta(semana.fin)} else if(t==='mes'){const x=rangoMes(mesActual);setFDesde(x.inicio);setFHasta(x.fin)} else if(t==='pendientes'){setFDesde('');setFHasta('');setFEstado('Pendiente')} else {setFDesde('');setFHasta('')} setSeccion('pacientes');};

  const agregarClinica=()=>{const n=nuevaClinica.trim();if(!n)return;if(catalogo.some(c=>normalizar(c.nombre)===normalizar(n))){alert('Esa clínica ya existe.');return;}setCatalogo(p=>[...p,{id:`c-${Date.now()}`,nombre:n,doctores:[]}]);setNuevaClinica('');setClinicaAdmin(n)};
  const agregarDoctor=()=>{const d=nuevoDoctor.trim();if(!clinicaAdmin||!d)return;setCatalogo(p=>p.map(c=>c.nombre!==clinicaAdmin?c:{...c,doctores:(c.doctores||[]).some(x=>normalizar(x)===normalizar(d))?c.doctores:[...(c.doctores||[]),d]}));setNuevoDoctor('')};
  const quitarDoctor=(cn,d)=>{if(confirm(`¿Quitar a ${d}?`))setCatalogo(p=>p.map(c=>c.nombre===cn?{...c,doctores:c.doctores.filter(x=>x!==d)}:c))};
  const quitarClinica=n=>{if(confirm(`¿Eliminar ${n} del catálogo? Los pacientes históricos no se borran.`))setCatalogo(p=>p.filter(c=>c.nombre!==n))};

  const descargarRespaldo=()=>{const blob=new Blob([JSON.stringify({fecha:new Date().toISOString(),registros,catalogo},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`imadent-respaldo-${hoy()}.json`;a.click();URL.revokeObjectURL(a.href)};
  const restaurar=e=>{const f=e.target.files?.[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const x=JSON.parse(String(rd.result));if(!Array.isArray(x.registros))throw new Error();if(confirm('¿Restaurar este respaldo?')){setRegistros(x.registros);if(Array.isArray(x.catalogo))setCatalogo(x.catalogo);alert('Respaldo restaurado.')}}catch{alert('Archivo de respaldo no válido.')}};rd.readAsText(f);e.target.value=''};
  const exportarMesCsv=()=>{const rows=[['Fecha','Paciente','Estudio','Precio','Clínica','Doctor','Pago','Entrega','Comisión'],...listaHist.map(r=>[r.fecha,r.nombre,r.estudio,r.precio,r.clinica,doctorRegistro(r,catalogo),r.estadoPago,r.tipoEntrega,comision(r)])];const csv='\uFEFF'+rows.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`historial-${mesHistorial}.csv`;a.click();};

  const Tabla=({lista,acciones=false})=><div className="tableWrap"><table><thead><tr><th>Fecha</th><th>Paciente</th><th>Estudio</th><th>Clínica</th><th>Doctor</th><th>Precio</th><th>Pago</th><th>Comisión</th>{acciones&&<th>Acciones</th>}</tr></thead><tbody>{lista.length===0?<tr><td colSpan={acciones?9:8} className="empty">No hay registros.</td></tr>:lista.map(r=><tr key={r.id}><td>{r.fecha}</td><td><b>{r.nombre}</b></td><td>{r.estudio}</td><td>{r.clinica||'-'}</td><td>{doctorRegistro(r,catalogo)}</td><td>{dinero(r.precio)}</td><td><span className={`badge ${r.estadoPago==='Pagado'?'ok':'warn'}`}>{r.estadoPago}</span></td><td>{dinero(comision(r))}</td>{acciones&&<td><div className="rowBtns"><button onClick={()=>editar(r)}>Editar</button><button className="danger" onClick={()=>eliminar(r.id)}>Eliminar</button></div></td>}</tr>)}</tbody></table></div>;
  const Kpis=({r})=><div className="kpis"><div className="kpi accent"><small>Pacientes</small><b>{r.pacientes}</b></div><div className="kpi accent"><small>Ingresos</small><b>{dinero(r.ingresos)}</b></div><div className="kpi accent"><small>Comisiones</small><b>{dinero(r.comisiones)}</b></div><div className="kpi"><small>Cobrado</small><b>{dinero(r.cobrado)}</b></div><div className="kpi"><small>Pendiente</small><b>{dinero(r.pendiente)}</b></div><div className="kpi"><small>Panorámicas</small><b>{r.panoramicas}</b></div><div className="kpi"><small>Laterales</small><b>{r.laterales}</b></div><div className="kpi"><small>Ambos</small><b>{r.ambos}</b></div></div>;

  return <div className="app"><style>{`
    *{box-sizing:border-box}body{margin:0;background:#f4f7f8;color:#17343b;font-family:Inter,system-ui,Arial,sans-serif}.app{min-height:100vh}.top{background:linear-gradient(120deg,#102e36,#0f5962);color:white;padding:22px 28px}.topIn{max-width:1320px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:20px}.brand{font-weight:900;font-size:28px;letter-spacing:1px}.brand span{color:#6dd7dc}.sub{font-size:12px;opacity:.8;margin-top:4px}.date{background:#ffffff16;padding:11px 15px;border-radius:12px;font-weight:750}.nav{max-width:1320px;margin:18px auto 0;display:flex;gap:8px;flex-wrap:wrap;padding:0 18px}.nav button,.period button{border:1px solid #dce5e8;background:#fff;border-radius:11px;padding:11px 15px;font-weight:800;color:#445a61;cursor:pointer}.nav button.on,.period button.on{background:#087d87;color:#fff;border-color:#087d87}.main{max-width:1320px;margin:auto;padding:20px 18px 60px}.title{font-size:28px;margin:4px 0}.desc{color:#6b7e84;margin:0 0 18px}.card{background:#fff;border:1px solid #e3eaec;border-radius:16px;padding:18px;box-shadow:0 4px 18px #17343b0a;margin-bottom:16px}.cardTitle{font-size:18px;font-weight:900;margin-bottom:14px}.quick,.period,.rowBtns,.backup{display:flex;gap:8px;flex-wrap:wrap}.btn{border:0;border-radius:10px;padding:11px 14px;font-weight:850;cursor:pointer}.primary{background:#087d87;color:#fff}.light{background:#edf4f5;color:#35555d}.danger{background:#fff1f1!important;color:#a62f39!important}.period{margin-bottom:16px}.range{display:inline-block;background:#eaf6f6;color:#08737b;padding:9px 12px;border-radius:10px;font-weight:800;margin-bottom:14px}.kpis{display:grid;grid-template-columns:repeat(5,minmax(150px,1fr));gap:12px;margin-bottom:16px}.kpi{background:#fff;border:1px solid #e4ebed;border-radius:15px;padding:16px}.kpi.accent{border-top:3px solid #15929a}.kpi small{display:block;color:#6d7f85;text-transform:uppercase;font-size:11px;font-weight:900}.kpi b{display:block;font-size:24px;margin-top:6px}.today{background:linear-gradient(135deg,#e9f7f7,#f8fbfb);border-color:#cde6e7}.formGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.field{display:flex;flex-direction:column;gap:6px}.field label{font-size:12px;font-weight:850;color:#50656c}.field input,.field select,.field textarea,.toolbar input,.toolbar select{border:1px solid #d9e3e6;border-radius:10px;padding:11px;background:#fff;font:inherit}.span2{grid-column:span 2}.span3{grid-column:span 3}.toolbar{display:grid;grid-template-columns:2fr repeat(4,1fr);gap:8px;margin:12px 0}.tableWrap{overflow:auto}.tableWrap table{width:100%;border-collapse:collapse;min-width:900px}.tableWrap th,.tableWrap td{text-align:left;padding:11px 9px;border-bottom:1px solid #edf1f2;font-size:13px}.tableWrap th{font-size:11px;text-transform:uppercase;color:#697c82}.badge{padding:5px 8px;border-radius:999px;font-size:11px;font-weight:900}.ok{background:#e7f7ef;color:#1b7a4b}.warn{background:#fff2d9;color:#a56a00}.empty{text-align:center!important;color:#87959a;padding:26px!important}.admin{display:grid;grid-template-columns:360px 1fr;gap:16px}.clinic{border:1px solid #e5ebed;border-radius:12px;padding:13px;margin-bottom:10px}.clinicTop{display:flex;justify-content:space-between;gap:10px;align-items:center}.chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.chip{background:#eef5f6;border-radius:999px;padding:7px 10px;font-size:12px}.chip button{border:0;background:transparent;color:#a52f39;font-weight:900;cursor:pointer}.commissionGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}.reportGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.report{border:1px solid #dce6e8;border-radius:14px;padding:16px;background:#fbfdfd}.report h3{margin:0 0 4px}.report .total{font-size:26px;font-weight:900;color:#087d87;margin:12px 0}.muted{color:#71848a;font-size:13px}.rowBtns button{border:0;border-radius:8px;padding:7px 9px;cursor:pointer}.backup{align-items:center}.note{background:#eaf7f6;padding:13px;border-radius:11px;color:#356867;margin-top:14px;font-size:13px;line-height:1.5}@media(max-width:950px){.kpis{grid-template-columns:repeat(2,1fr)}.formGrid,.commissionGrid,.admin,.reportGrid{grid-template-columns:1fr}.span2,.span3{grid-column:span 1}.toolbar{grid-template-columns:1fr 1fr}.date{display:none}}@media(max-width:560px){.kpis{grid-template-columns:1fr}.toolbar{grid-template-columns:1fr}.top{padding:18px}.brand{font-size:23px}}
  `}</style>
    <header className="top"><div className="topIn"><div><div className="brand">IMA <span>DENT</span></div><div className="sub">Centro Radiológico Dental · Sistema administrativo</div></div><div className="date">{new Intl.DateTimeFormat('es-MX',{dateStyle:'long'}).format(new Date())}</div></div></header>
    <nav className="nav">{[['dashboard','📊 Panel de control'],['pacientes','👤 Pacientes'],['comisiones','💰 Comisiones'],['catalogo','⚙ Clínicas y doctores'],['respaldo','💾 Respaldo']].map(([k,t])=><button key={k} className={seccion===k?'on':''} onClick={()=>setSeccion(k)}>{t}</button>)}</nav>
    <main className="main">
      {seccion==='dashboard'&&<><h1 className="title">Panel de control</h1><p className="desc">Consulta rápidamente esta semana, el mes actual y el historial mensual.</p>
        <div className="quick"><button className="btn primary" onClick={()=>setSeccion('pacientes')}>+ Registrar paciente</button><button className="btn light" onClick={()=>filtroRapido('semana')}>👥 Ver pacientes de esta semana</button><button className="btn light" onClick={()=>filtroRapido('pendientes')}>⚠ Pagos pendientes</button></div>
        <div className="card today"><div className="cardTitle">Corte de hoy · {hoy()}</div><Kpis r={rHoy}/></div>
        <div className="period"><button className={vista==='semana'?'on':''} onClick={()=>setVista('semana')}>🗓 Esta semana</button><button className={vista==='mes'?'on':''} onClick={()=>setVista('mes')}>📅 Este mes</button><button className={vista==='historial'?'on':''} onClick={()=>setVista('historial')}>🗂 Historial del mes</button></div>
        {vista==='semana'&&<><div className="range">Semana: {semana.inicio} al {semana.fin}</div><Kpis r={rSemana}/><div className="card"><div className="cardTitle">Pacientes de esta semana</div><Tabla lista={listaSemana}/></div></>}
        {vista==='mes'&&<><div className="range">{nombreMes(mesActual)}</div><Kpis r={rMes}/><div className="card"><div className="cardTitle">Pacientes del mes</div><Tabla lista={listaMes}/></div></>}
        {vista==='historial'&&<><div className="card"><div className="cardTitle">Historial del mes</div><div className="quick"><select value={mesHistorial} onChange={e=>setMesHistorial(e.target.value)}>{meses.map(m=><option key={m} value={m}>{nombreMes(m)}</option>)}</select><button className="btn light" onClick={exportarMesCsv}>⬇ Exportar CSV</button></div></div><Kpis r={rHist}/><div className="card"><div className="cardTitle">Pacientes de {nombreMes(mesHistorial)}</div><Tabla lista={listaHist}/></div></>}
      </>}

      {seccion==='pacientes'&&<><h1 className="title">Pacientes</h1><p className="desc">Registra, busca y consulta pacientes por día, semana o mes.</p>
        <div className="card"><div className="cardTitle">{editId?'Editar paciente':'Registrar paciente'}</div><div className="formGrid">
          <div className="field"><label>Fecha</label><input type="date" value={form.fecha} onChange={e=>setCampo('fecha',e.target.value)}/></div><div className="field"><label>Paciente</label><input value={form.nombre} onChange={e=>setCampo('nombre',e.target.value)} placeholder="Nombre completo"/></div><div className="field"><label>Teléfono</label><input value={form.telefono} onChange={e=>setCampo('telefono',e.target.value)}/></div>
          <div className="field"><label>Estudio</label><select value={form.estudio} onChange={e=>setCampo('estudio',e.target.value)}>{Object.keys(PRECIOS).map(x=><option key={x}>{x}</option>)}</select></div><div className="field"><label>Precio</label><input value={dinero(PRECIOS[form.estudio])} readOnly/></div><div className="field"><label>Tipo de pago</label><select value={form.tipoPago} onChange={e=>setCampo('tipoPago',e.target.value)}><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option></select></div>
          <div className="field"><label>Estado</label><select value={form.estadoPago} onChange={e=>setCampo('estadoPago',e.target.value)}><option>Pagado</option><option>Pendiente</option></select></div><div className="field"><label>Clínica</label><select value={form.clinica} onChange={e=>setForm(p=>({...p,clinica:e.target.value,doctor:''}))}><option value="">Seleccionar</option>{catalogo.map(c=><option key={c.id} value={c.nombre}>{c.nombre}</option>)}</select></div><div className="field"><label>Doctor</label><select value={form.doctor} onChange={e=>setCampo('doctor',e.target.value)}><option value="">Seleccionar</option>{doctoresForm.map(d=><option key={d}>{d}</option>)}</select></div>
          <div className="field"><label>Entrega</label><select value={form.tipoEntrega} onChange={e=>setCampo('tipoEntrega',e.target.value)}><option>Digital</option><option>Impresa</option></select></div><div className="field span2"><label>Observaciones</label><input value={form.observaciones} onChange={e=>setCampo('observaciones',e.target.value)}/></div>
        </div><div className="quick" style={{marginTop:14}}><button className="btn primary" onClick={guardar}>{editId?'Guardar cambios':'Guardar paciente'}</button>{editId&&<button className="btn light" onClick={limpiar}>Cancelar</button>}</div></div>
        <div className="card"><div className="cardTitle">Pacientes registrados</div><div className="quick"><button className="btn light" onClick={()=>filtroRapido('hoy')}>Hoy</button><button className="btn light" onClick={()=>filtroRapido('semana')}>Esta semana</button><button className="btn light" onClick={()=>filtroRapido('mes')}>Este mes</button><button className="btn light" onClick={()=>filtroRapido('pendientes')}>Pendientes</button><button className="btn light" onClick={()=>filtroRapido('todos')}>Todos</button></div><div className="toolbar"><input placeholder="Buscar paciente, clínica, doctor..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/><select value={fClinica} onChange={e=>setFClinica(e.target.value)}><option value="">Todas las clínicas</option>{catalogo.map(c=><option key={c.id} value={c.nombre}>{c.nombre}</option>)}</select><input type="date" value={fDesde} onChange={e=>setFDesde(e.target.value)}/><input type="date" value={fHasta} onChange={e=>setFHasta(e.target.value)}/><select value={fEstado} onChange={e=>setFEstado(e.target.value)}><option value="">Todos los estados</option><option>Pagado</option><option>Pendiente</option></select></div><Tabla lista={pacientesVisibles} acciones/></div>
      </>}

      {seccion==='comisiones'&&<><h1 className="title">Comisiones</h1><p className="desc">Consulta comisiones por mes, clínica y doctor.</p><div className="card"><div className="commissionGrid"><div className="field"><label>Mes</label><select value={mesCom} onChange={e=>setMesCom(e.target.value)}><option value="TODOS">Todos los meses</option>{meses.map(m=><option key={m} value={m}>{nombreMes(m)}</option>)}</select></div><div className="field"><label>Clínica</label><select value={clinicaCom} onChange={e=>setClinicaCom(e.target.value)}><option value="TODAS">Todas</option>{catalogo.map(c=><option key={c.id} value={c.nombre}>{c.nombre}</option>)}</select></div><div className="field"><label>Doctor</label><select value={doctorCom} onChange={e=>setDoctorCom(e.target.value)}><option value="TODOS">Todos</option>{doctoresCom.map(d=><option key={d}>{d}</option>)}</select></div></div></div>
        <div className="reportGrid">{gruposCom.length===0?<div className="card empty">No hay comisiones con estos filtros.</div>:gruposCom.map((g,i)=><div className="report" key={i}><h3>{g.doctor}</h3><div className="muted">{g.clinica}</div><div className="muted" style={{marginTop:10}}>Pacientes: <b>{g.pacientes}</b> · Digitales: <b>{g.digitales}</b> · Impresas: <b>{g.impresas}</b></div><div className="muted">Ingresos generados: <b>{dinero(g.ingresos)}</b></div><div className="total">{dinero(g.total)}</div>{mesCom!=='TODOS'&&<button className="btn primary" onClick={()=>descargarPngDoctor(g,mesCom)}>⬇ Descargar imagen</button>}</div>)}</div>
      </>}

      {seccion==='catalogo'&&<><h1 className="title">Clínicas y doctores</h1><p className="desc">Administra las opciones del registro sin editar código.</p><div className="admin"><div className="card"><div className="cardTitle">Agregar clínica</div><div className="field"><label>Nombre</label><input value={nuevaClinica} onChange={e=>setNuevaClinica(e.target.value)}/></div><button className="btn primary" style={{marginTop:10}} onClick={agregarClinica}>+ Agregar clínica</button><hr style={{border:0,borderTop:'1px solid #e8edef',margin:'20px 0'}}/><div className="cardTitle">Agregar doctor</div><div className="field"><label>Clínica</label><select value={clinicaAdmin} onChange={e=>setClinicaAdmin(e.target.value)}><option value="">Seleccionar</option>{catalogo.map(c=><option key={c.id} value={c.nombre}>{c.nombre}</option>)}</select></div><div className="field" style={{marginTop:10}}><label>Doctor(a)</label><input value={nuevoDoctor} onChange={e=>setNuevoDoctor(e.target.value)}/></div><button className="btn primary" style={{marginTop:10}} onClick={agregarDoctor}>+ Agregar doctor</button></div><div className="card"><div className="cardTitle">Catálogo actual</div>{catalogo.map(c=><div className="clinic" key={c.id}><div className="clinicTop"><div><b>{c.nombre}</b><div className="muted">{c.doctores.length} doctor(es)</div></div><button className="btn danger" onClick={()=>quitarClinica(c.nombre)}>Eliminar clínica</button></div><div className="chips">{c.doctores.map(d=><span className="chip" key={d}>{d} <button onClick={()=>quitarDoctor(c.nombre,d)}>×</button></span>)}</div></div>)}</div></div>
      </>}

      {seccion==='respaldo'&&<><h1 className="title">Respaldo</h1><p className="desc">Protege tus pacientes, clínicas y doctores.</p><div className="card"><div className="cardTitle">Seguridad de datos</div><p>Hay <b>{registros.length}</b> pacientes y <b>{catalogo.length}</b> clínicas guardadas en este navegador.</p><div className="backup"><button className="btn primary" onClick={descargarRespaldo}>⬇ Descargar respaldo</button><label className="btn light">⬆ Restaurar respaldo<input type="file" accept=".json" onChange={restaurar} style={{display:'none'}}/></label></div><div className="note"><b>Importante:</b> se conserva la misma clave <code>imadent_registros</code>, por lo que esta actualización no borra tu historial actual. Te recomiendo descargar un respaldo cada semana.</div></div></>}
    </main>
  </div>;
}

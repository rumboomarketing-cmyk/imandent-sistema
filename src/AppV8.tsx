// IMADENT v8 · doctores visibles + alta rápida + cortes y comisiones PNG
// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';

const PRECIOS = {
  'Panorámica': 350,
  'Lateral': 350,
  'Panorámica y Lateral': 700,
};

const COMISIONES = { Digital: 50, Impresa: 40 };

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
  fecha:'',
  nombre:'',
  telefono:'',
  estudio:'Panorámica',
  tipoPago:'Efectivo',
  estadoPago:'Pagado',
  clinica:'',
  doctor:'',
  tipoEntrega:'Digital',
  generaComision:true,
  observaciones:'',
};

const pad = n => String(n).padStart(2,'0');
const fechaLocal = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const hoy = () => fechaLocal(new Date());
const mesActual = () => hoy().slice(0,7);
const dinero = n => Number(n||0).toLocaleString('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0});
const normalizar = (t='') => t.toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const slug = (t='') => normalizar(t).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'item';

function nombreMes(m){
  if(!m) return '';
  const [y,mo] = m.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric'}).format(new Date(y,mo-1,1));
}
function lunesDeFecha(fecha){
  if(!fecha) return '';
  const d = new Date(`${fecha}T00:00:00`);
  const day = d.getDay();
  d.setDate(d.getDate() + (day===0 ? -6 : 1-day));
  return fechaLocal(d);
}
function finSemana(lunes){
  if(!lunes) return '';
  const d = new Date(`${lunes}T00:00:00`);
  d.setDate(d.getDate()+6);
  return fechaLocal(d);
}
const etiquetaSemana = lunes => `${lunes} al ${finSemana(lunes)}`;

function generaComisionRegistro(r){ return r?.generaComision !== false; }
function comisionRegistro(r){
  if(!generaComisionRegistro(r)) return 0;
  if(r?.comision !== undefined && r?.comision !== null && r?.comision !== '') return Number(r.comision)||0;
  return Number(COMISIONES[r?.tipoEntrega]||0);
}
const precioRegistro = r => Number(r?.precio ?? PRECIOS[r?.estudio] ?? 0);

function doctorRegistro(r){
  const d = String(r?.doctor||'').trim();
  return d || 'NO APLICA';
}
function clinicaRegistro(r){
  const c = String(r?.clinica||'').trim();
  return c || 'EXTERNA / SIN CLÍNICA';
}

function resumen(lista){
  const pagos={Efectivo:0,Transferencia:0,Tarjeta:0,Otro:0};
  let ingresos=0,cobrado=0,pendiente=0,comisiones=0,conComision=0,sinComision=0;
  for(const r of lista){
    const p=precioRegistro(r);
    ingresos+=p;
    comisiones+=comisionRegistro(r);
    if(generaComisionRegistro(r)) conComision++; else sinComision++;
    if(r.estadoPago==='Pagado'){
      cobrado+=p;
      const tp=r.tipoPago||'Otro';
      pagos[tp]=(pagos[tp]||0)+p;
    } else pendiente+=p;
  }
  return {pacientes:lista.length,ingresos,cobrado,pendiente,comisiones,pagos,conComision,sinComision};
}

function descargarTexto(nombre,texto,tipo='application/json'){
  const blob=new Blob([texto],{type:tipo});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=nombre;a.click();
  URL.revokeObjectURL(url);
}
function ellipsis(ctx,text,max){
  let s=String(text??'');
  if(ctx.measureText(s).width<=max) return s;
  while(s.length>2 && ctx.measureText(s+'…').width>max) s=s.slice(0,-1);
  return s+'…';
}
function descargarReportePNG({titulo,subtitulo,resumenLineas=[],columnas=[],filas=[],archivo='reporte.png'}){
  const width=1600,margin=70,headerH=200,lineH=42,rowH=48;
  const summaryH=resumenLineas.length?60+resumenLineas.length*lineH:0;
  const tableH=columnas.length?70+Math.max(1,filas.length)*rowH:0;
  const height=Math.max(760,margin*2+headerH+summaryH+tableH+70);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.fillStyle='#f3f7f8';ctx.fillRect(0,0,width,height);
  ctx.fillStyle='#073b45';ctx.fillRect(0,0,width,headerH);
  ctx.fillStyle='#fff';ctx.font='700 54px Arial';ctx.fillText('IMA DENT',margin,82);
  ctx.font='700 34px Arial';ctx.fillText(titulo,margin,140);
  ctx.font='24px Arial';ctx.fillStyle='#cdebf0';ctx.fillText(subtitulo,margin,177);
  let y=headerH+55;
  if(resumenLineas.length){
    ctx.fillStyle='#fff';ctx.strokeStyle='#d5e3e6';ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect(margin,y-25,width-margin*2,summaryH,18);ctx.fill();ctx.stroke();
    let sy=y+17;ctx.fillStyle='#20343b';ctx.font='700 28px Arial';ctx.fillText('Resumen',margin+28,sy);
    sy+=44;ctx.font='24px Arial';
    for(const line of resumenLineas){ctx.fillStyle='#344b54';ctx.fillText(line,margin+28,sy);sy+=lineH}
    y+=summaryH+25;
  }
  if(columnas.length){
    const totalW=width-margin*2,sum=columnas.reduce((a,c)=>a+(c.peso||1),0),widths=columnas.map(c=>totalW*(c.peso||1)/sum);
    ctx.fillStyle='#0b7f89';ctx.fillRect(margin,y,totalW,58);
    let x=margin;ctx.font='700 21px Arial';ctx.fillStyle='#fff';
    columnas.forEach((c,i)=>{ctx.fillText(ellipsis(ctx,c.titulo,widths[i]-18),x+9,y+37);x+=widths[i]});
    y+=58;ctx.font='20px Arial';
    if(!filas.length){
      ctx.fillStyle='#fff';ctx.fillRect(margin,y,totalW,rowH);ctx.fillStyle='#718089';ctx.fillText('Sin registros',margin+15,y+32);
    } else filas.forEach((fila,ri)=>{
      ctx.fillStyle=ri%2===0?'#fff':'#edf5f6';ctx.fillRect(margin,y,totalW,rowH);
      let xx=margin;ctx.fillStyle='#24373e';
      columnas.forEach((c,i)=>{
        const val=typeof c.valor==='function'?c.valor(fila):fila[c.clave];
        ctx.fillText(ellipsis(ctx,val??'',widths[i]-18),xx+9,y+32);xx+=widths[i];
      });
      y+=rowH;
    });
  }
  ctx.fillStyle='#698088';ctx.font='20px Arial';ctx.fillText(`Generado ${new Date().toLocaleString('es-MX')}`,margin,height-32);
  const a=document.createElement('a');a.download=archivo;a.href=canvas.toDataURL('image/png',1);a.click();
}

export default function App(){
  const [seccion,setSeccion]=useState('dashboard');
  const [registros,setRegistros]=useState(()=>{try{return JSON.parse(localStorage.getItem('imadent_registros')||'[]')}catch{return[]}});
  const [clinicas,setClinicas]=useState(()=>{try{return JSON.parse(localStorage.getItem('imadent_catalogo_clinicas')||'null')||CLINICAS_BASE}catch{return CLINICAS_BASE}});
  const [form,setForm]=useState({...FORM_BASE,fecha:hoy()});
  const [editId,setEditId]=useState(null);
  const [busqueda,setBusqueda]=useState('');
  const [filtro,setFiltro]=useState('semana');
  const [vistaDash,setVistaDash]=useState('semana');
  const [mesHist,setMesHist]=useState(mesActual());
  const [semanaCorte,setSemanaCorte]=useState(lunesDeFecha(hoy()));
  const [mesCom,setMesCom]=useState(mesActual());

  const [nuevaClinica,setNuevaClinica]=useState('');
  const [clinicaAdmin,setClinicaAdmin]=useState('');
  const [nombreClinicaEdit,setNombreClinicaEdit]=useState('');
  const [nuevoDoctor,setNuevoDoctor]=useState('');
  const [doctorAdmin,setDoctorAdmin]=useState('');
  const [nombreDoctorEdit,setNombreDoctorEdit]=useState('');
  const importRef=useRef(null);

  useEffect(()=>localStorage.setItem('imadent_registros',JSON.stringify(registros)),[registros]);
  useEffect(()=>localStorage.setItem('imadent_catalogo_clinicas',JSON.stringify(clinicas)),[clinicas]);

  const semanaActual=lunesDeFecha(hoy());
  const clinicaForm=useMemo(()=>clinicas.find(c=>c.nombre===form.clinica),[clinicas,form.clinica]);
  const doctoresClinica=clinicaForm?.doctores||[];
  const todosDoctores=useMemo(()=>{
    const set=new Set();
    clinicas.forEach(c=>(c.doctores||[]).forEach(d=>d&&set.add(d)));
    return [...set].sort((a,b)=>a.localeCompare(b));
  },[clinicas]);
  const opcionesDoctor=form.clinica?doctoresClinica:todosDoctores;

  const regsSemana=useMemo(()=>registros.filter(r=>r.fecha&&lunesDeFecha(r.fecha)===semanaActual),[registros,semanaActual]);
  const regsMes=useMemo(()=>registros.filter(r=>(r.fecha||'').slice(0,7)===mesActual()),[registros]);
  const resSemana=useMemo(()=>resumen(regsSemana),[regsSemana]);
  const resMes=useMemo(()=>resumen(regsMes),[regsMes]);

  const semanasDisponibles=useMemo(()=>{
    const s=new Set([semanaActual]);registros.forEach(r=>r.fecha&&s.add(lunesDeFecha(r.fecha)));
    return [...s].filter(Boolean).sort().reverse();
  },[registros,semanaActual]);
  const mesesDisponibles=useMemo(()=>{
    const s=new Set([mesActual()]);registros.forEach(r=>r.fecha&&s.add((r.fecha||'').slice(0,7)));
    return [...s].filter(Boolean).sort().reverse();
  },[registros]);

  const registrosLista=useMemo(()=>{
    let list=[...registros];
    if(filtro==='hoy')list=list.filter(r=>r.fecha===hoy());
    if(filtro==='semana')list=list.filter(r=>r.fecha&&lunesDeFecha(r.fecha)===semanaActual);
    if(filtro==='mes')list=list.filter(r=>(r.fecha||'').slice(0,7)===mesActual());
    if(filtro==='pendiente')list=list.filter(r=>r.estadoPago!=='Pagado');
    if(filtro==='sincomision')list=list.filter(r=>!generaComisionRegistro(r));
    if(busqueda.trim()){
      const q=normalizar(busqueda);
      list=list.filter(r=>[r.nombre,r.clinica,r.doctor,r.estudio,r.folio].some(v=>normalizar(v||'').includes(q)));
    }
    return list.sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')||Number(b.id||0)-Number(a.id||0));
  },[registros,filtro,busqueda,semanaActual]);

  const regsHist=useMemo(()=>registros.filter(r=>(r.fecha||'').slice(0,7)===mesHist).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')),[registros,mesHist]);
  const regsCorte=useMemo(()=>registros.filter(r=>r.fecha&&lunesDeFecha(r.fecha)===semanaCorte).sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||'')),[registros,semanaCorte]);
  const resCorte=useMemo(()=>resumen(regsCorte),[regsCorte]);
  const regsCom=useMemo(()=>registros.filter(r=>(r.fecha||'').slice(0,7)===mesCom&&comisionRegistro(r)>0),[registros,mesCom]);

  const comClinicas=useMemo(()=>{
    const map={};
    for(const r of regsCom){
      const n=clinicaRegistro(r);
      if(!map[n])map[n]={nombre:n,pacientes:0,digital:0,impresa:0,total:0};
      map[n].pacientes++;const c=comisionRegistro(r);map[n].total+=c;
      if(r.tipoEntrega==='Impresa')map[n].impresa+=c;else map[n].digital+=c;
    }
    return Object.values(map).sort((a,b)=>a.nombre.localeCompare(b.nombre));
  },[regsCom]);
  const comDoctores=useMemo(()=>{
    const map={};
    for(const r of regsCom){
      const n=doctorRegistro(r);
      if(!map[n])map[n]={nombre:n,pacientes:0,total:0,clinicas:{}};
      map[n].pacientes++;map[n].total+=comisionRegistro(r);
      const c=clinicaRegistro(r);map[n].clinicas[c]=(map[n].clinicas[c]||0)+comisionRegistro(r);
    }
    return Object.values(map).sort((a,b)=>a.nombre.localeCompare(b.nombre));
  },[regsCom]);
  const totalComMes=useMemo(()=>regsCom.reduce((s,r)=>s+comisionRegistro(r),0),[regsCom]);

  function setCampo(k,v){setForm(f=>({...f,[k]:v}))}
  function seleccionarClinica(nombre){setForm(f=>({...f,clinica:nombre,doctor:''}))}
  function limpiar(){setForm({...FORM_BASE,fecha:hoy()});setEditId(null)}

  function guardarDoctorActual(){
    const doctor=form.doctor.trim();
    if(!doctor){alert('Escribe o selecciona el nombre del doctor.');return}
    if(!form.clinica){alert('Selecciona una clínica para guardar este doctor en su lista.');return}
    const c=clinicas.find(x=>x.nombre===form.clinica);
    if((c?.doctores||[]).some(d=>normalizar(d)===normalizar(doctor))){alert('Ese doctor ya está en esta clínica.');return}
    setClinicas(cs=>cs.map(c=>c.nombre===form.clinica?{...c,doctores:[...(c.doctores||[]),doctor]}:c));
    alert('Doctor agregado a la clínica.');
  }

  function guardar(){
    const fecha=form.fecha||hoy();
    const nombre=form.nombre.trim()||'SIN NOMBRE';
    const doctor=form.doctor.trim();
    const clinica=form.clinica.trim();

    if(doctor&&clinica){
      const c=clinicas.find(x=>x.nombre===clinica);
      if(c && !(c.doctores||[]).some(d=>normalizar(d)===normalizar(doctor))){
        setClinicas(cs=>cs.map(x=>x.nombre===clinica?{...x,doctores:[...(x.doctores||[]),doctor]}:x));
      }
    }

    const base={
      ...form,
      fecha,
      nombre,
      telefono:form.telefono.trim(),
      clinica,
      doctor,
      observaciones:form.observaciones.trim(),
      precio:PRECIOS[form.estudio]||0,
      comision:form.generaComision?(COMISIONES[form.tipoEntrega]||0):0,
      generaComision:!!form.generaComision,
    };
    if(editId!==null)setRegistros(rs=>rs.map(r=>r.id===editId?{...r,...base}:r));
    else setRegistros(rs=>[{...base,id:Date.now(),folio:`IMA-${Date.now()}`},...rs]);
    limpiar();setSeccion('pacientes');
  }

  function editar(r){
    setEditId(r.id);
    setForm({
      fecha:r.fecha||hoy(),nombre:r.nombre||'',telefono:r.telefono||'',estudio:r.estudio||'Panorámica',
      tipoPago:r.tipoPago||'Efectivo',estadoPago:r.estadoPago||'Pagado',clinica:r.clinica||'',doctor:r.doctor||'',
      tipoEntrega:r.tipoEntrega||'Digital',generaComision:r.generaComision!==false,observaciones:r.observaciones||''
    });
    setSeccion('pacientes');setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),50);
  }
  function borrar(id){if(confirm('¿Eliminar este paciente?'))setRegistros(rs=>rs.filter(r=>r.id!==id))}

  function agregarClinica(){
    const n=nuevaClinica.trim();if(!n)return;
    if(clinicas.some(c=>normalizar(c.nombre)===normalizar(n))){alert('La clínica ya existe.');return}
    setClinicas(cs=>[...cs,{id:`${slug(n)}-${Date.now()}`,nombre:n,doctores:[]}]);setNuevaClinica('');
  }
  function seleccionarClinicaAdmin(nombre){setClinicaAdmin(nombre);setNombreClinicaEdit(nombre);setDoctorAdmin('');setNombreDoctorEdit('')}
  function renombrarClinica(){
    const nuevo=nombreClinicaEdit.trim();if(!clinicaAdmin||!nuevo)return;
    if(clinicas.some(c=>c.nombre!==clinicaAdmin&&normalizar(c.nombre)===normalizar(nuevo))){alert('Ya existe otra clínica con ese nombre.');return}
    setClinicas(cs=>cs.map(c=>c.nombre===clinicaAdmin?{...c,nombre:nuevo}:c));
    setRegistros(rs=>rs.map(r=>r.clinica===clinicaAdmin?{...r,clinica:nuevo}:r));
    if(form.clinica===clinicaAdmin)setCampo('clinica',nuevo);
    setClinicaAdmin(nuevo);setNombreClinicaEdit(nuevo);
  }
  function eliminarClinica(){
    if(!clinicaAdmin)return;if(!confirm('¿Quitar esta clínica del catálogo? El historial no se borrará.'))return;
    setClinicas(cs=>cs.filter(c=>c.nombre!==clinicaAdmin));setClinicaAdmin('');setNombreClinicaEdit('');
  }
  function agregarDoctor(){
    const d=nuevoDoctor.trim();if(!clinicaAdmin||!d){alert('Selecciona clínica y escribe el nombre del doctor.');return}
    const c=clinicas.find(x=>x.nombre===clinicaAdmin);
    if((c?.doctores||[]).some(x=>normalizar(x)===normalizar(d))){alert('Ese doctor ya existe.');return}
    setClinicas(cs=>cs.map(c=>c.nombre===clinicaAdmin?{...c,doctores:[...(c.doctores||[]),d]}:c));setNuevoDoctor('');
  }
  function seleccionarDoctorAdmin(d){setDoctorAdmin(d);setNombreDoctorEdit(d)}
  function renombrarDoctor(){
    const nuevo=nombreDoctorEdit.trim();if(!clinicaAdmin||!doctorAdmin||!nuevo)return;
    setClinicas(cs=>cs.map(c=>c.nombre===clinicaAdmin?{...c,doctores:(c.doctores||[]).map(d=>d===doctorAdmin?nuevo:d)}:c));
    setRegistros(rs=>rs.map(r=>r.clinica===clinicaAdmin&&r.doctor===doctorAdmin?{...r,doctor:nuevo}:r));
    setDoctorAdmin(nuevo);setNombreDoctorEdit(nuevo);
  }
  function eliminarDoctor(){
    if(!clinicaAdmin||!doctorAdmin)return;if(!confirm('¿Quitar este doctor de la lista?'))return;
    setClinicas(cs=>cs.map(c=>c.nombre===clinicaAdmin?{...c,doctores:(c.doctores||[]).filter(d=>d!==doctorAdmin)}:c));
    setDoctorAdmin('');setNombreDoctorEdit('');
  }

  function exportarRespaldo(){
    descargarTexto(`imadent-respaldo-${hoy()}.json`,JSON.stringify({registros,clinicas,exportado:new Date().toISOString()},null,2));
  }
  function importarRespaldo(file){
    if(!file)return;const reader=new FileReader();
    reader.onload=()=>{try{const data=JSON.parse(String(reader.result||''));if(Array.isArray(data.registros))setRegistros(data.registros);if(Array.isArray(data.clinicas))setClinicas(data.clinicas);alert('Respaldo restaurado.')}catch{alert('Archivo no válido.')}};
    reader.readAsText(file);
  }

  function descargarCorte(){
    descargarReportePNG({
      titulo:'Corte semanal',
      subtitulo:etiquetaSemana(semanaCorte),
      resumenLineas:[
        `Pacientes: ${resCorte.pacientes}`,
        `Ingresos: ${dinero(resCorte.ingresos)} · Cobrado: ${dinero(resCorte.cobrado)} · Pendiente: ${dinero(resCorte.pendiente)}`,
        `Comisiones: ${dinero(resCorte.comisiones)} · Sin comisión: ${resCorte.sinComision}`,
        `Efectivo: ${dinero(resCorte.pagos.Efectivo)} · Transferencia: ${dinero(resCorte.pagos.Transferencia)} · Tarjeta: ${dinero(resCorte.pagos.Tarjeta)}`,
      ],
      columnas:[
        {titulo:'Fecha',peso:1,valor:r=>r.fecha},
        {titulo:'Paciente',peso:2,valor:r=>r.nombre},
        {titulo:'Estudio',peso:1.5,valor:r=>r.estudio},
        {titulo:'Clínica',peso:1.6,valor:r=>clinicaRegistro(r)},
        {titulo:'Doctor',peso:1.7,valor:r=>doctorRegistro(r)},
        {titulo:'Precio',peso:1,valor:r=>dinero(precioRegistro(r))},
        {titulo:'Com.',peso:1,valor:r=>dinero(comisionRegistro(r))},
      ],
      filas:regsCorte,archivo:`corte-${semanaCorte}.png`
    });
  }
  function descargarComClinicas(){
    descargarReportePNG({
      titulo:'Comisiones por clínicas',subtitulo:nombreMes(mesCom),
      resumenLineas:[`Total de comisiones del mes: ${dinero(totalComMes)}`],
      columnas:[
        {titulo:'Clínica',peso:2,valor:r=>r.nombre},{titulo:'Pacientes',peso:1,valor:r=>r.pacientes},
        {titulo:'Digital',peso:1,valor:r=>dinero(r.digital)},{titulo:'Impresa',peso:1,valor:r=>dinero(r.impresa)},
        {titulo:'Total',peso:1,valor:r=>dinero(r.total)}
      ],filas:comClinicas,archivo:`comisiones-clinicas-${mesCom}.png`
    });
  }
  function descargarComDoctores(){
    descargarReportePNG({
      titulo:'Comisiones por doctores',subtitulo:nombreMes(mesCom),
      resumenLineas:[`Total de comisiones del mes: ${dinero(totalComMes)}`],
      columnas:[
        {titulo:'Doctor',peso:2,valor:r=>r.nombre},{titulo:'Pacientes',peso:1,valor:r=>r.pacientes},
        {titulo:'Clínicas',peso:2,valor:r=>Object.keys(r.clinicas).join(', ')},{titulo:'Total',peso:1,valor:r=>dinero(r.total)}
      ],filas:comDoctores,archivo:`comisiones-doctores-${mesCom}.png`
    });
  }

  const estilos=`
  *{box-sizing:border-box}html,body,#root{margin:0!important;min-height:100%!important;width:100%!important;max-width:none!important;background:#f4f7f9!important;color:#19323a!important;font-family:Inter,system-ui,Segoe UI,Arial,sans-serif!important;text-align:left!important;color-scheme:light!important}
  body{min-width:0!important}.app{display:flex;min-height:100vh}.side{width:240px;background:#073b45;color:white;padding:24px 16px;position:sticky;top:0;height:100vh}
  .brand{font-size:26px;font-weight:900;margin-bottom:24px}.nav{display:grid;gap:8px}.nav button{border:0;background:transparent;color:#d7eef1;text-align:left;padding:12px 14px;border-radius:10px;font-weight:700;cursor:pointer}
  .nav button.active,.nav button:hover{background:#0c5964;color:white}.main{flex:1;padding:30px;min-width:0}.title{font-size:32px;margin:0 0 6px}.sub{color:#667b83;margin:0 0 20px}
  .card{background:white;border:1px solid #dbe5e8;border-radius:16px;padding:18px;margin-bottom:18px;box-shadow:0 2px 8px rgba(0,0,0,.03)}.card h2,.card h3{margin-top:0}
  .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}.field{display:flex;flex-direction:column;gap:6px}.field label{font-size:13px;font-weight:800;color:#40555d}
  input,select,textarea{width:100%;border:1px solid #c9d7dc!important;border-radius:10px!important;padding:11px 12px!important;background:#fff!important;color:#102c34!important;-webkit-text-fill-color:#102c34!important;font-size:15px!important;opacity:1!important}
  input::placeholder,textarea::placeholder{color:#8b9ba1!important;-webkit-text-fill-color:#8b9ba1!important}textarea{min-height:84px;resize:vertical}.buttons,.row,.quick{display:flex;gap:9px;flex-wrap:wrap;align-items:end}
  .btn{border:1px solid #cfdcdf;background:#fff;color:#18343c;padding:10px 14px;border-radius:10px;font-weight:800;cursor:pointer}.btn.primary{background:#087f89;color:#fff;border-color:#087f89}.btn.danger{color:#a4323b;border-color:#e8c8cc}.btn.small{padding:7px 10px;font-size:13px}
  .kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:18px}.kpi{background:white;border:1px solid #dbe5e8;border-radius:14px;padding:16px}.kpi span{display:block;color:#6d8087;font-size:13px;font-weight:700}.kpi b{display:block;font-size:25px;margin-top:4px}
  .table{overflow:auto;border:1px solid #dbe5e8;border-radius:12px}.table table{width:100%;border-collapse:collapse;background:white;min-width:900px}.table th,.table td{padding:11px 12px;border-bottom:1px solid #e4ecee;text-align:left;white-space:nowrap}.table th{background:#eef5f6;color:#38545b;font-size:13px}.badge{padding:5px 8px;border-radius:999px;font-size:12px;font-weight:800;background:#eaf7ef;color:#257243}.badge.off{background:#f2f2f2;color:#687579}
  .notice{background:#edf8f9;border:1px solid #cce7e9;padding:12px 14px;border-radius:10px;color:#31545b;margin-bottom:14px}.doctor-help{font-size:12px;color:#657b83;margin-top:5px}.doctor-actions{display:flex;gap:8px;margin-top:8px}.period{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}
  @media(max-width:1000px){.side{width:190px}.grid{grid-template-columns:repeat(2,1fr)}.kpis{grid-template-columns:repeat(2,1fr)}.two{grid-template-columns:1fr}.main{padding:20px}}
  @media(max-width:700px){.app{display:block}.side{width:100%;height:auto;position:relative}.nav{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}.main{padding:14px}.kpis{grid-template-columns:1fr 1fr}}
  `;

  return <><style>{estilos}</style><div className="app">
    <aside className="side"><div className="brand">IMA DENT</div><div className="nav">
      {[["dashboard","Panel"],["pacientes","Pacientes"],["cortes","Cortes"],["comisiones","Comisiones"],["clinicas","Clínicas y doctores"],["respaldo","Respaldo"]].map(([k,t])=><button key={k} className={seccion===k?'active':''} onClick={()=>setSeccion(k)}>{t}</button>)}
    </div></aside>

    <main className="main">
      {seccion==='dashboard'&&<>
        <h1 className="title">Panel de control</h1><p className="sub">Resumen rápido de IMADENT.</p>
        <div className="period"><button className="btn primary" onClick={()=>setVistaDash('semana')}>Esta semana</button><button className="btn" onClick={()=>setVistaDash('mes')}>Este mes</button><button className="btn" onClick={()=>setSeccion('pacientes')}>+ Registrar paciente</button></div>
        {(vistaDash==='semana'?resSemana:resMes)&&(()=>{const r=vistaDash==='semana'?resSemana:resMes;return <div className="kpis">
          <div className="kpi"><span>Pacientes</span><b>{r.pacientes}</b></div><div className="kpi"><span>Ingresos</span><b>{dinero(r.ingresos)}</b></div><div className="kpi"><span>Cobrado</span><b>{dinero(r.cobrado)}</b></div><div className="kpi"><span>Pendiente</span><b>{dinero(r.pendiente)}</b></div><div className="kpi"><span>Comisiones</span><b>{dinero(r.comisiones)}</b></div>
        </div>})()}
      </>}

      {seccion==='pacientes'&&<>
        <h1 className="title">{editId!==null?'Editar paciente':'Pacientes'}</h1><p className="sub">Puedes guardar aunque dejes datos vacíos. El doctor puede seleccionarse o escribirse.</p>
        <div className="card">
          <div className="grid">
            <div className="field"><label>Fecha</label><input type="date" value={form.fecha} onChange={e=>setCampo('fecha',e.target.value)}/></div>
            <div className="field"><label>Paciente</label><input value={form.nombre} onChange={e=>setCampo('nombre',e.target.value)} placeholder="Nombre del paciente"/></div>
            <div className="field"><label>Teléfono</label><input value={form.telefono} onChange={e=>setCampo('telefono',e.target.value)} placeholder="Opcional"/></div>
            <div className="field"><label>Estudio</label><select value={form.estudio} onChange={e=>setCampo('estudio',e.target.value)}>{Object.keys(PRECIOS).map(x=><option key={x}>{x}</option>)}</select></div>

            <div className="field"><label>Clínica</label><select value={form.clinica} onChange={e=>seleccionarClinica(e.target.value)}><option value="">Externa / sin clínica</option>{clinicas.map(c=><option key={c.id||c.nombre} value={c.nombre}>{c.nombre}</option>)}</select></div>
            <div className="field">
              <label>Doctor</label>
              <input list="lista-doctores-imadent" value={form.doctor} onChange={e=>setCampo('doctor',e.target.value)} placeholder={form.clinica?'Selecciona o escribe doctor':'Selecciona o escribe cualquier doctor'}/>
              <datalist id="lista-doctores-imadent">{opcionesDoctor.map(d=><option key={d} value={d}/>)}</datalist>
              <div className="doctor-help">{form.clinica ? (doctoresClinica.length?`${doctoresClinica.length} doctor(es) disponibles en ${form.clinica}`:'Esta clínica aún no tiene doctores. Escribe uno y se guardará automáticamente.') : 'Sin clínica seleccionada: puedes escribir el doctor manualmente.'}</div>
              {form.clinica&&form.doctor.trim()&&<div className="doctor-actions"><button type="button" className="btn small" onClick={guardarDoctorActual}>+ Guardar doctor en esta clínica</button></div>}
            </div>

            <div className="field"><label>Tipo de pago</label><select value={form.tipoPago} onChange={e=>setCampo('tipoPago',e.target.value)}><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option><option>Otro</option></select></div>
            <div className="field"><label>Estado de pago</label><select value={form.estadoPago} onChange={e=>setCampo('estadoPago',e.target.value)}><option>Pagado</option><option>Pendiente</option></select></div>
            <div className="field"><label>Entrega</label><select value={form.tipoEntrega} onChange={e=>setCampo('tipoEntrega',e.target.value)}><option>Digital</option><option>Impresa</option></select></div>
            <div className="field"><label>¿Genera comisión?</label><select value={form.generaComision?'si':'no'} onChange={e=>setCampo('generaComision',e.target.value==='si')}><option value="si">Sí, dar comisión</option><option value="no">No dar comisión</option></select></div>
            <div className="field" style={{gridColumn:'span 2'}}><label>Observaciones</label><textarea value={form.observaciones} onChange={e=>setCampo('observaciones',e.target.value)} placeholder="Opcional"/></div>
          </div>
          <div className="buttons" style={{marginTop:14}}><button className="btn primary" onClick={guardar}>{editId!==null?'Guardar cambios':'Guardar paciente'}</button>{editId!==null&&<button className="btn" onClick={limpiar}>Cancelar edición</button>}</div>
        </div>

        <div className="card">
          <div className="quick"><button className="btn" onClick={()=>setFiltro('hoy')}>Hoy</button><button className="btn" onClick={()=>setFiltro('semana')}>Esta semana</button><button className="btn" onClick={()=>setFiltro('mes')}>Este mes</button><button className="btn" onClick={()=>setFiltro('pendiente')}>Pendientes</button><button className="btn" onClick={()=>setFiltro('sincomision')}>Sin comisión</button><button className="btn" onClick={()=>setFiltro('todos')}>Todos</button></div>
          <div className="field" style={{margin:'12px 0'}}><label>Buscar</label><input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Paciente, clínica, doctor o estudio"/></div>
          <div className="table"><table><thead><tr><th>Fecha</th><th>Paciente</th><th>Estudio</th><th>Clínica</th><th>Doctor</th><th>Precio</th><th>Comisión</th><th>Acciones</th></tr></thead><tbody>
            {registrosLista.length===0?<tr><td colSpan={8}>No hay registros.</td></tr>:registrosLista.map(r=><tr key={r.id}><td>{r.fecha}</td><td><b>{r.nombre}</b></td><td>{r.estudio}</td><td>{clinicaRegistro(r)}</td><td>{doctorRegistro(r)}</td><td>{dinero(precioRegistro(r))}</td><td><span className={`badge ${generaComisionRegistro(r)?'':'off'}`}>{generaComisionRegistro(r)?dinero(comisionRegistro(r)):'NO'}</span></td><td><button className="btn small" onClick={()=>editar(r)}>Editar</button> <button className="btn small danger" onClick={()=>borrar(r.id)}>Eliminar</button></td></tr>)}
          </tbody></table></div>
        </div>
      </>}

      {seccion==='cortes'&&<>
        <h1 className="title">Cortes semanales</h1><p className="sub">Selecciona una semana y descarga el corte en imagen.</p>
        <div className="card"><div className="row"><div className="field" style={{minWidth:280}}><label>Semana</label><select value={semanaCorte} onChange={e=>setSemanaCorte(e.target.value)}>{semanasDisponibles.map(s=><option key={s} value={s}>{etiquetaSemana(s)}</option>)}</select></div><button className="btn primary" onClick={descargarCorte}>Descargar corte PNG</button></div></div>
        <div className="kpis"><div className="kpi"><span>Pacientes</span><b>{resCorte.pacientes}</b></div><div className="kpi"><span>Ingresos</span><b>{dinero(resCorte.ingresos)}</b></div><div className="kpi"><span>Cobrado</span><b>{dinero(resCorte.cobrado)}</b></div><div className="kpi"><span>Pendiente</span><b>{dinero(resCorte.pendiente)}</b></div><div className="kpi"><span>Comisiones</span><b>{dinero(resCorte.comisiones)}</b></div></div>
      </>}

      {seccion==='comisiones'&&<>
        <h1 className="title">Comisiones mensuales</h1><p className="sub">Solo incluye registros marcados con comisión.</p>
        <div className="card"><div className="row"><div className="field" style={{minWidth:260}}><label>Mes</label><select value={mesCom} onChange={e=>setMesCom(e.target.value)}>{mesesDisponibles.map(m=><option key={m} value={m}>{nombreMes(m)}</option>)}</select></div><button className="btn primary" onClick={descargarComClinicas}>PNG clínicas</button><button className="btn primary" onClick={descargarComDoctores}>PNG doctores</button></div><div className="notice" style={{marginTop:14}}>Total de comisiones: <b>{dinero(totalComMes)}</b></div></div>
        <div className="two">
          <div className="card"><h2>Por clínica</h2><div className="table"><table><thead><tr><th>Clínica</th><th>Pacientes</th><th>Total</th></tr></thead><tbody>{comClinicas.map(x=><tr key={x.nombre}><td>{x.nombre}</td><td>{x.pacientes}</td><td>{dinero(x.total)}</td></tr>)}</tbody></table></div></div>
          <div className="card"><h2>Por doctor</h2><div className="table"><table><thead><tr><th>Doctor</th><th>Pacientes</th><th>Total</th></tr></thead><tbody>{comDoctores.map(x=><tr key={x.nombre}><td>{x.nombre}</td><td>{x.pacientes}</td><td>{dinero(x.total)}</td></tr>)}</tbody></table></div></div>
        </div>
      </>}

      {seccion==='clinicas'&&<>
        <h1 className="title">Clínicas y doctores</h1><p className="sub">Aquí puedes agregar, modificar o quitar nombres.</p>
        <div className="two">
          <div className="card"><h2>Agregar clínica</h2><div className="row"><div className="field" style={{flex:1}}><label>Nombre</label><input value={nuevaClinica} onChange={e=>setNuevaClinica(e.target.value)} placeholder="Nueva clínica"/></div><button className="btn primary" onClick={agregarClinica}>Agregar</button></div></div>
          <div className="card"><h2>Modificar clínica</h2><div className="field"><label>Clínica</label><select value={clinicaAdmin} onChange={e=>seleccionarClinicaAdmin(e.target.value)}><option value="">Seleccionar clínica</option>{clinicas.map(c=><option key={c.id||c.nombre} value={c.nombre}>{c.nombre}</option>)}</select></div>{clinicaAdmin&&<><div className="field" style={{marginTop:10}}><label>Nuevo nombre</label><input value={nombreClinicaEdit} onChange={e=>setNombreClinicaEdit(e.target.value)}/></div><div className="buttons" style={{marginTop:10}}><button className="btn primary" onClick={renombrarClinica}>Guardar nombre</button><button className="btn danger" onClick={eliminarClinica}>Quitar clínica</button></div></>}</div>
        </div>
        {clinicaAdmin&&<div className="card"><h2>Doctores de {clinicaAdmin}</h2><div className="two">
          <div><div className="field"><label>Nuevo doctor</label><input value={nuevoDoctor} onChange={e=>setNuevoDoctor(e.target.value)} placeholder="Ej. Dra. Ana López"/></div><button className="btn primary" style={{marginTop:10}} onClick={agregarDoctor}>+ Agregar doctor</button><div className="notice" style={{marginTop:12}}>{(clinicas.find(c=>c.nombre===clinicaAdmin)?.doctores||[]).length} doctor(es) registrados en esta clínica.</div></div>
          <div><div className="field"><label>Doctor registrado</label><select value={doctorAdmin} onChange={e=>seleccionarDoctorAdmin(e.target.value)}><option value="">Seleccionar doctor</option>{(clinicas.find(c=>c.nombre===clinicaAdmin)?.doctores||[]).map(d=><option key={d} value={d}>{d}</option>)}</select></div>{doctorAdmin&&<><div className="field" style={{marginTop:10}}><label>Nuevo nombre</label><input value={nombreDoctorEdit} onChange={e=>setNombreDoctorEdit(e.target.value)}/></div><div className="buttons" style={{marginTop:10}}><button className="btn primary" onClick={renombrarDoctor}>Guardar nombre</button><button className="btn danger" onClick={eliminarDoctor}>Quitar doctor</button></div></>}</div>
        </div></div>}
      </>}

      {seccion==='respaldo'&&<>
        <h1 className="title">Respaldo e historial</h1><p className="sub">Descarga una copia de seguridad de los registros.</p>
        <div className="card"><div className="buttons"><button className="btn primary" onClick={exportarRespaldo}>Descargar respaldo JSON</button><button className="btn" onClick={()=>importRef.current?.click()}>Restaurar respaldo</button><input ref={importRef} type="file" accept="application/json" style={{display:'none'}} onChange={e=>importarRespaldo(e.target.files?.[0])}/></div></div>
        <div className="card"><h2>Historial mensual</h2><div className="field" style={{maxWidth:300}}><label>Mes</label><select value={mesHist} onChange={e=>setMesHist(e.target.value)}>{mesesDisponibles.map(m=><option key={m} value={m}>{nombreMes(m)}</option>)}</select></div><div className="table" style={{marginTop:14}}><table><thead><tr><th>Fecha</th><th>Paciente</th><th>Estudio</th><th>Clínica</th><th>Doctor</th><th>Precio</th></tr></thead><tbody>{regsHist.map(r=><tr key={r.id}><td>{r.fecha}</td><td>{r.nombre}</td><td>{r.estudio}</td><td>{clinicaRegistro(r)}</td><td>{doctorRegistro(r)}</td><td>{dinero(precioRegistro(r))}</td></tr>)}</tbody></table></div></div>
      </>}
    </main>
  </div></>;
}

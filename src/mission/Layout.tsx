import {useEffect,useState} from 'react';
import {Link,NavLink,Outlet,useLocation} from 'react-router';
import {Activity,ArrowUpRight,ChartNoAxesCombined,Crosshair,Database,LayoutDashboard,Map,Menu,Moon,Orbit,Settings,ShieldCheck,Trophy,X} from 'lucide-react';
import {useMission} from './context';
import {missionRoutes} from './routes';
const icons={dashboard:LayoutDashboard,terrain:Map,skyline:ChartNoAxesCombined,candidates:Trophy,evaluation:Activity,dataset:Database,status:ShieldCheck,settings:Settings};
export function DashboardLayout(){
 const m=useMission(),location=useLocation(),[open,setOpen]=useState(false);
 const route=missionRoutes.find(r=>r.path===location.pathname)||missionRoutes[0];
 useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[]);
 useEffect(()=>{window.scrollTo(0,0);setOpen(false);document.title=`${route.title} · LunaTrail`},[location.pathname,route.title]);
 return <div className="mc"><a className="skip-link" href="#mission-main">Skip to content</a>
 {open&&<button className="mc-scrim" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
 <aside id="mission-navigation" className={`mc-sidebar ${open?'is-open':''}`}><Link className="mc-brand" to="/"><span className="mc-brand-icon"><Orbit size={32}/></span><b>LunaTrail<small>GPS for a World That Has None</small></b></Link><p className="mc-nav-label">MISSION WORKSPACE</p><nav aria-label="Mission navigation">{missionRoutes.map(r=>{const Icon=icons[r.icon];return <NavLink key={r.path} to={r.path}><Icon size={18}/><span>{r.label}</span></NavLink>})}</nav><div className="mc-side-bottom"><div className="mc-system"><span><i className={`mc-dot ${m.health?.overall==='Operational'?'good':'warn'}`}/> Mission status</span><strong>{m.health?.overall||'Offline'}</strong><small>{m.health?'Live backend health checks':'Backend connection unavailable'}</small><Link to="/status">View system diagnostics <ArrowUpRight size={13}/></Link></div><div className="mc-team"><span>CODEFLOW</span><small>COLOSSUS 3.0</small></div></div></aside>
 <div className="mc-main"><div className="mc-topbar"><button className="mc-mobile-menu" onClick={()=>setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open} aria-controls="mission-navigation">{open?<X/>:<Menu/>}</button><span><Moon size={14}/> LUNAR NAVIGATION <span className="mc-separator">/</span> {route.label}</span><span className="mc-local"><i className={`mc-dot ${m.health?'good':'warn'}`}/>{m.health?'LOCAL CONNECTION':'DISCONNECTED'}</span></div>
 <header className="mc-header"><div><div className="mc-eyebrow">LUNATRAIL / MISSION WORKSPACE</div><h1>{route.title}<span className="mc-title-dot">.</span></h1><p>{route.subtitle}</p></div>{route.path==='/dashboard'?<button className="mc-button primary" disabled={!!m.busy||!m.data?.index||(!m.data?.observation&&!m.data?.tests.length)} onClick={()=>void m.match()}><Crosshair size={18}/>Run Localization <ArrowUpRight size={16}/></button>:<span className="mc-header-mark"><Orbit size={54}/></span>}</header>
 <div className="mc-feedback" aria-live="polite">{m.busy&&<div className="mc-working"><span className="mc-spinner"/>{m.busy}…</div>}{m.error&&<div role="alert" className="mc-error">{m.error}<button onClick={()=>void m.refresh()}>Retry connection</button></div>}{!m.busy&&m.notice&&<div className="mc-notice">{m.notice}</div>}</div>
 {m.data&&!m.data.index&&<div className="mc-feedback"><div className="mc-warning">Reference profiles need regeneration. <Link to="/dataset">Open Dataset and regenerate profiles →</Link></div></div>}
 {m.data?.observation?.source==='manual'&&<div className="mc-feedback"><div className="mc-warning">Manual skyline active · Ground truth and position error are unavailable. Held-out evaluation uses the original demo tests.</div></div>}
 <main id="mission-main" className="mc-content">{!m.data?<div className="mc-loading"><div className="mc-skeleton"/><div className="mc-skeleton"/><p>{m.error?'Start the backend, then retry connection.':'Loading terrain and validating reference profiles…'}</p></div>:<Outlet/>}</main>
 <div className="mc-footnote"><span>CODEFLOW <i>×</i> COLOSSUS 3.0</span><span>Terrain-derived simulation · Scores are not probabilities</span></div></div></div>
}

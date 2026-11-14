import {BrowserRouter,Route,Routes,Link} from 'react-router';
import {MissionProvider} from './mission/context';
import {DashboardLayout} from './mission/Layout';
import {LandingPage} from './pages/LandingPage';
import {MissionDashboard} from './pages/MissionDashboard';
import {TerrainMap} from './pages/TerrainMap';
import {SkylineMatch} from './pages/SkylineMatch';
import {CandidateRanking} from './pages/CandidateRanking';
import {Evaluation} from './pages/Evaluation';
import {Dataset} from './pages/Dataset';
import {SystemStatus} from './pages/SystemStatus';
import {Settings} from './pages/Settings';
import './styles/mission.css';
export default function App(){return <BrowserRouter><Routes><Route path="/" element={<LandingPage/>}/><Route element={<MissionProvider><DashboardLayout/></MissionProvider>}><Route path="/dashboard" element={<MissionDashboard/>}/><Route path="/terrain" element={<TerrainMap/>}/><Route path="/skyline" element={<SkylineMatch/>}/><Route path="/candidates" element={<CandidateRanking/>}/><Route path="/evaluation" element={<Evaluation/>}/><Route path="/dataset" element={<Dataset/>}/><Route path="/status" element={<SystemStatus/>}/><Route path="/settings" element={<Settings/>}/></Route><Route path="*" element={<div className="mc-empty"><h1>Page not found</h1><Link to="/dashboard">Return to Mission Control →</Link></div>}/></Routes></BrowserRouter>}

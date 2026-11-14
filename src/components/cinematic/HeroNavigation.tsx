import {ArrowUpRight} from 'lucide-react';
import {Link} from 'react-router';
import {Logo} from '../ui/Logo';
export function HeroNavigation(){return <header className="hero-nav"><Link className="brand" to="/" aria-label="LunaTrail overview"><Logo/><span>LUNATRAIL</span></Link><nav aria-label="Main navigation"><Link to="/terrain">Terrain</Link><Link to="/skyline">Skyline</Link><Link to="/evaluation">Evaluation</Link></nav><Link className="mission-cta" to="/dashboard">Initialize mission <ArrowUpRight size={14}/></Link></header>}

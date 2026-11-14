import {useEffect,useState} from 'react';
import {Link} from 'react-router';
import {CinematicExperience} from '../components/cinematic/CinematicExperience';
import {MediaSettings} from '../components/ui/MediaSettings';
import {useReducedMotion} from '../hooks/useReducedMotion';
import {defaultMedia} from '../config/scenes';
import type {MediaConfig} from '../config/scenes';
import {releaseMedia} from '../lib/mediaStore';
export function LandingPage(){const [media,setMedia]=useState<MediaConfig>(defaultMedia),[settings,setSettings]=useState(false);const reduced=useReducedMotion();useEffect(()=>{document.title='LunaTrail · GPS for a World That Has None';window.scrollTo(0,0);return()=>releaseMedia(media)},[media]);return <><Link className="skip-link" to="/dashboard">Skip to Mission Control</Link><main><CinematicExperience key={media.mode+(media.mode==='video'?media.src:media.sources[0])} config={media} reduced={reduced} onConfigure={()=>setSettings(true)}/></main>{settings&&<MediaSettings onClose={()=>setSettings(false)} onApply={value=>setMedia(value||defaultMedia)}/>}</>}

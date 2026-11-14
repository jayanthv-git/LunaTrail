export const missionRoutes=[
 {path:'/dashboard',label:'Mission Dashboard',title:'Mission Control',subtitle:'Lunar Skyline Navigation System',icon:'dashboard'},
 {path:'/terrain',label:'Terrain Map',title:'Lunar Terrain Map',subtitle:'Explore, analyze, and select regions from lunar elevation data.',icon:'terrain'},
 {path:'/skyline',label:'Skyline Match',title:'Skyline Match',subtitle:'Match an unknown 360° lunar horizon against reference skylines.',icon:'skyline'},
 {path:'/candidates',label:'Candidate Ranking',title:'Candidate Ranking',subtitle:'Rank reference viewpoints by skyline similarity.',icon:'candidates'},
 {path:'/evaluation',label:'Evaluation',title:'Evaluation',subtitle:'Assess localization across held-out test viewpoints.',icon:'evaluation'},
 {path:'/dataset',label:'Dataset',title:'Dataset',subtitle:'Manage elevation data, reference skylines, and held-out observations.',icon:'dataset'},
 {path:'/status',label:'System Status',title:'System Status',subtitle:'Monitor the LunaTrail processing pipeline.',icon:'status'},
 {path:'/settings',label:'Settings',title:'Settings',subtitle:'Configure terrain processing, localization, and application preferences.',icon:'settings'},
] as const;

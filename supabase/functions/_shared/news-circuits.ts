/** Vínculo conservador pelo título; títulos com duas sedes explícitas ficam sem vínculo. */
export function newsCircuitId(title:string):string|null{
 const text=title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const aliases:Record<string,string[]>={interlagos:['sao paulo','brasil'],rodriguez:['mexico','cidade do mexico'],americas:['estados unidos','austin','eua'],albert_park:['australia'],shanghai:['china'],suzuka:['japao'],villeneuve:['canada'],monaco:['monaco'],catalunya:['barcelona','catalunha'],madring:['madrid','espanha'],red_bull_ring:['austria'],silverstone:['gra-bretanha','inglaterra'],spa:['belgica'],hungaroring:['hungria'],zandvoort:['holanda','paises baixos'],monza:['italia'],baku:['azerbaijao'],sepang:['malasia'],marina_bay:['singapura'],miami:['miami'],vegas:['las vegas'],losail:['catar'],yas_marina:['abu dhabi']};
 const found=Object.entries(aliases).filter(([,names])=>names.some(n=>new RegExp(`\\b(?:gp|grande premio) (?:d[aeo]s? )?${n}\\b`).test(text))).map(([id])=>id);return found.length===1?found[0]:null;
}

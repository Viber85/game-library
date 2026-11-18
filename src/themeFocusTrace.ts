/** Passive, bounded Steam CEF focus transition inspection.
 * One sample is one frame. Triggered only by Settings gamepad-focus
 * mutations/focus events; never reads labels, inputs, URLs or text. */
export const THEME_FOCUS_TRACE_SCRIPT="(() => {\n  try {\n    // Steam's real, visible Settings rail. Do not read any text or input.\n    const sel='.BasicUI .PageListColumn,.BasicUI [class*=\"gamepadpagedsettings_PagedSettingsDialog_PageListColumn\"],[data-glm-settings-sidebar]';\n    const rails=Array.from(document.querySelectorAll(sel)).slice(0,4);\n    const rail=rails.find(r=>r.querySelector?.('.gpfocus,.gpfocuswithin,:focus-visible,[aria-selected=\"true\"],[aria-current=\"page\"]'))||rails[0];\n    if(!rail)return JSON.stringify(null);\n    const fmt=(element)=>typeof element?.className==='string'\n      ?element.className.split(/\\s+/)\n        .filter(c=>/^[A-Za-z_][A-Za-z0-9_-]{2,85}$/.test(c))\n        .slice(0,3).join(' ').slice(0,150):'';\n    const kind=(image)=>{\n      const value=String(image||'none');\n      return value==='none'?'none':/gradient/i.test(value)?'gradient':\n        /url\\(|image-set/i.test(value)?'image':'other';\n    };\n    const color=(raw)=>{\n      const value=String(raw||'');\n      return /^rgba?\\([\\d., ]+\\)$/.test(value)?value.slice(0,45):'';\n    };\n    const seen=new Set(),nodes=[];\n    const add=(element,role)=>{\n      if(!element||seen.has(element)||nodes.length>=10)return;\n      if(!rail.contains(element)&&element!==rail&&element!==rail.parentElement)return;\n      seen.add(element);nodes.push({element,role});\n    };\n    add(rail,'rail');add(rail.parentElement,'rail-parent');\n    const focused=Array.from(rail.querySelectorAll(\n      '.gpfocus,.gpfocuswithin,:focus-visible,[aria-selected=\"true\"],[aria-current=\"page\"],[class*=\"Active\"],[class*=\"Selected\"]'\n    )).slice(0,6);\n    for(const element of focused){\n      add(element,'focus');\n      add(element.parentElement,'focus-parent');\n      if(element.firstElementChild)add(element.firstElementChild,'focus-child');\n    }\n    const active=document.activeElement;\n    if(active && rail.contains(active)) {\n      add(active,'active');\n      add(active.parentElement,'active-parent');\n    }\n    // Hit-testing sees native overlays that are not the focused DOM node.\n    if(typeof document.elementsFromPoint==='function'){\n      const focus=focused.find(e=>typeof e.getBoundingClientRect==='function')||active;\n      if(focus && rail.contains(focus)){\n        const rect=focus.getBoundingClientRect?.();\n        if(rect&&rect.width>0&&rect.height>0){\n          const hits=document.elementsFromPoint(rect.left+rect.width*.52,rect.top+rect.height*.5)||[];\n          for(const hit of Array.from(hits).slice(0,5))\n            if(rail.contains(hit))add(hit,'paint-hit');\n        }\n      }\n    }\n    const items=[];\n    for(const {element,role} of nodes){\n      for(const layer of ['self','before','after']){\n        try{\n          const style=getComputedStyle(element,layer==='self'?null:'::'+layer);\n          if(!style)continue;\n          const background=color(style.backgroundColor);\n          const image=kind(style.backgroundImage);\n          const shadow=String(style.boxShadow||'none')==='none'?'none':'present';\n          if(layer!=='self' && !background && image==='none'&&shadow==='none')continue;\n          items.push({role,layer,cls:fmt(element),bg:background,image,shadow,\n            transition:String(style.transitionDuration||'').slice(0,30),\n            animation:String(style.animationName||'').slice(0,45),\n            focus:!!(element.classList?.contains?.('gpfocus')||\n              element.classList?.contains?.('gpfocuswithin'))});\n          if(items.length>=24)break;\n        }catch{}\n      }\n      if(items.length>=24)break;\n    }\n    return items.length>=2?JSON.stringify({at:Date.now(),items}):JSON.stringify(null);\n  }catch{return JSON.stringify(null);}\n})()";

export type ThemeFocusLayer={
  role:string;layer:"self"|"before"|"after";cls:string;bg:string;
  image:"none"|"gradient"|"image"|"other";shadow:"none"|"present";
  transition:string;animation:string;focus:boolean;
};
export type ThemeFocusFrame={at:number;reason:string;items:ThemeFocusLayer[]};
const safeClass=/^[A-Za-z0-9_ -]*$/;
export function parseThemeFocusFrame(input:unknown):ThemeFocusFrame|null{
  let item:unknown=input;
  try{if(typeof item==="string")item=JSON.parse(item);}catch{return null;}
  if(!item||typeof item!=="object")return null;
  const o=item as Record<string,unknown>;
  if(typeof o.at!=="number"||!Number.isFinite(o.at)||o.at<=0||
     !Array.isArray(o.items))return null;
  const parts:ThemeFocusLayer[]=o.items.slice(0,24).flatMap(value=>{
    if(!value||typeof value!=="object")return [];
    const e=value as Record<string,unknown>;
    const str=(k:string,n:number)=>typeof e[k]==="string"?String(e[k]).slice(0,n):"";
    const role=str("role",20),layer=e.layer,cls=str("cls",150),bg=str("bg",45);
    const image=e.image,shadow=e.shadow,transition=str("transition",30),
      animation=str("animation",45);
    if(!safeClass.test(cls)||!safeClass.test(role)||
      !(layer==="self"||layer==="before"||layer==="after")||
      !(image==="none"||image==="gradient"||image==="image"||image==="other")||
      !(shadow==="none"||shadow==="present")||
      !/^(?:|rgba?\([0-9., ]+\))$/.test(bg)||
      !/^[A-Za-z0-9 .,%_-]*$/.test(transition)||
      !/^[A-Za-z0-9 _,-]*$/.test(animation))return [];
    return [{role,layer,cls,bg,image,shadow,transition,animation,focus:e.focus===true}];
  });
  const reason=typeof o.reason==="string"?o.reason.slice(0,24):"unknown";
  return parts.length>=2&&/^[A-Za-z0-9_-]+$/.test(reason)?
    {at:o.at,reason,items:parts}:null;
}

import {useEffect,useRef,useState,type CSSProperties} from "react";
import {MdVideogameAsset} from "react-icons/md";
import {posterCandidates,type LibraryGame} from "./steam";

/** Use the same Steam artwork lookup as our non-Steam-compatible game cards.
 * A missing image becomes a generic game icon rather than a broken image. */
export function RunningGameIcon({game}:{game:LibraryGame|undefined}) {
  const [imageIndex,setImageIndex]=useState(0);
  useEffect(()=>setImageIndex(0),[game?.id]);
  const images=game?posterCandidates(game):[];
  const src=images[imageIndex];
  return src ? <img className="gl-running-art" src={src} alt=""
    onError={()=>setImageIndex(value=>value+1)}/>
    : <MdVideogameAsset className="gl-rail-icon" aria-hidden="true"/>;
}

/** Marquee activates only for an actually truncated title. A long title
 * remains legible in controller focus and never shifts other rail items. */
export function RunningGameLabel({title,expanded}:{title:string;expanded:boolean}) {
  const viewport=useRef<HTMLSpanElement>(null);
  const content=useRef<HTMLSpanElement>(null);
  const [overflow,setOverflow]=useState(0);
  useEffect(()=>{
    if(!expanded){setOverflow(0);return;}
    const measure=()=>{
      if(!viewport.current||!content.current)return;
      const pixels=Math.ceil(content.current.scrollWidth-viewport.current.clientWidth);
      setOverflow(pixels>3?pixels:0);
    };
    const frame=window.requestAnimationFrame(measure);
    let resize:ResizeObserver|undefined;
    if(typeof ResizeObserver!=="undefined"){
      resize=new ResizeObserver(measure);
      if(viewport.current)resize.observe(viewport.current);
      if(content.current)resize.observe(content.current);
    }
    return ()=>{
      window.cancelAnimationFrame(frame);
      resize?.disconnect();
    };
  },[title,expanded]);
  const style=overflow>0
    ? {"--gl-marquee-distance":overflow+"px"} as CSSProperties
    : undefined;
  return <span className="gl-rail-label gl-running-label">
    <span className="gl-running-title-viewport" ref={viewport}>
      <span ref={content} style={style}
        className={"gl-running-title"+(overflow>0?" gl-marquee-active":"")}>
        {title}
      </span>
    </span>
  </span>;
}


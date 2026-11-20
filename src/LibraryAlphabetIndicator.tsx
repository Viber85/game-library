import {useEffect,useRef,useState,type RefObject} from "react";
import {getGridColumnCount} from "./gridNavigation";
import {alphabetLetters,letterForTitle} from "./libraryAlphabet";
import type {LibraryGame} from "./steam";

type Props={
  games:readonly LibraryGame[];
  focusedGameId:number|undefined;
  descending:boolean;
  scrollRef:RefObject<HTMLDivElement|null>;
  gridRef:RefObject<HTMLDivElement|null>;
};

/** Passive on-screen position indicator. It never captures input or focus,
 * moves game cards, or makes a network request. Only letter transitions
 * cause this component to update; Dashboard and GameCard do not rerender.
 */
export function LibraryAlphabetIndicator({games,focusedGameId,descending,scrollRef,gridRef}:Props){
  const [letter,setLetter]=useState<string>("#");
  const [popup,setPopup]=useState<string|null>(null);
  const current=useRef<string|null>(null);
  const focusTime=useRef(0);
  const popupTimer=useRef<number|null>(null);
  const scrollFrame=useRef<number|null>(null);
  const order=alphabetLetters(descending);

  // Steam's Focusable can signal a controller focus without a browser
  // focusin event. The Dashboard already tracks that game's AppID, so this
  // fallback guarantees accurate D-pad/analog letter changes.
  const setCurrent=(index:number,announce:boolean)=>{
    if(index<0||index>=games.length)return;
    const next=letterForTitle(games[index].title);
    if(current.current===next)return;
    const previous=current.current;
    current.current=next;
    setLetter(next);
    if(announce&&previous!==null){
      setPopup(next);
      if(popupTimer.current!==null)window.clearTimeout(popupTimer.current);
      popupTimer.current=window.setTimeout(()=>{
        setPopup(null);
        popupTimer.current=null;
      },850);
    }
  };

  useEffect(()=>{
    if(focusedGameId===undefined)return;
    const index=games.findIndex(g=>g.id===focusedGameId);
    if(index<0)return;
    focusTime.current=Date.now();
    setCurrent(index,true);
  },[focusedGameId,games]);

  useEffect(()=>{
    const scroll=scrollRef.current;
    const grid=gridRef.current;
    if(!scroll||!grid||!games.length)return;
    let active=true;

    const rowIndexAtViewport=():number=>{
      const columns=Math.max(1,getGridColumnCount(grid));
      const visibleTop=scroll.getBoundingClientRect().top+6;
      const children=grid.children;
      // Inspect only one card per row (not every card or cover image).
      for(let i=0;i<children.length;i+=columns){
        const card=children[i];
        if(card.getBoundingClientRect().bottom>visibleTop)return i;
      }
      return Math.max(0,children.length-1);
    };
    const onFocus=(event:FocusEvent)=>{
      const target=event.target;
      if(!(target instanceof Element))return;
      const game=target.closest(".gl-game");
      if(!game||!grid.contains(game))return;
      const index=Array.prototype.indexOf.call(grid.children,game) as number;
      if(index<0)return;
      focusTime.current=Date.now();
      setCurrent(index,true);
    };
    const onScroll=()=>{
      if(scrollFrame.current!==null)return;
      scrollFrame.current=window.requestAnimationFrame(()=>{
        scrollFrame.current=null;
        if(!active)return;
        // Programmatic scrollIntoView immediately follows a focus event;
        // keep its focused game's letter instead of showing the row above.
        if(Date.now()-focusTime.current<220)return;
        setCurrent(rowIndexAtViewport(),true);
      });
    };

    scroll.addEventListener("focusin",onFocus);
    scroll.addEventListener("scroll",onScroll,{passive:true});
    const initialFrame=window.requestAnimationFrame(()=>{
      if(!active)return;
      const focused=document.activeElement;
      const game=focused instanceof Element?focused.closest(".gl-game"):null;
      const index=game&&grid.contains(game)?
        Array.prototype.indexOf.call(grid.children,game) as number:-1;
      setCurrent(index>=0?index:rowIndexAtViewport(),false);
    });
    return ()=>{
      active=false;
      scroll.removeEventListener("focusin",onFocus);
      scroll.removeEventListener("scroll",onScroll);
      window.cancelAnimationFrame(initialFrame);
      if(scrollFrame.current!==null)window.cancelAnimationFrame(scrollFrame.current);
      if(popupTimer.current!==null)window.clearTimeout(popupTimer.current);
    };
  },[games,scrollRef,gridRef]);

  return <>
    <div className="gl-alphabet-rail" aria-hidden="true">
      {order.map(char=><span key={char}
        className={"gl-alphabet-rail-letter"+(char===letter?" gl-alphabet-current":"")}>
        {char}
      </span>)}
    </div>
    <div aria-hidden="true" className={"gl-alphabet-popup"+
      (popup!==null?" gl-alphabet-popup-visible":"")}>
      {popup??letter}
    </div>
  </>;
}

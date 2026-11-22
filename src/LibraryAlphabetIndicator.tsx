import {useEffect,useMemo,useRef,useState,type PointerEvent as ReactPointerEvent,type RefObject} from "react";
import {Focusable,GamepadButton,GamepadEvent} from "@decky/ui";
import {getGridColumnCount} from "./gridNavigation";
import {
  alphabetLetters,firstGameByLetter,letterForTitle,nextPopulatedLetter,
  letterAtRailPosition,nearestPopulatedLetter,
} from "./libraryAlphabet";
type AlphabetGame={title:string;id?:number;key?:string};

type Props={
  games:readonly AlphabetGame[];
  allGames:readonly AlphabetGame[];
  focusedGameId:number|undefined;
  focusedGameKey?:string;
  descending:boolean;
  scrollRef:RefObject<HTMLDivElement|null>;
  gridRef:RefObject<HTMLDivElement|null>;
  railRef:RefObject<HTMLDivElement|null>;
  onJumpToGame:(index:number)=>void;
  onReturnToGame:()=>void;
  onOpenSort:()=>void;
  onChangeTab:(direction:-1|1)=>void;
};

/** Native Decky Focusable is entered explicitly from a grid row's last card.
 * Only this alphabet control handles A/B/up/down while focused. On other
 * screens (and non-alphabet sorts) the component is not mounted.
 */
export function LibraryAlphabetIndicator({
  games,allGames,focusedGameId,focusedGameKey,descending,scrollRef,gridRef,railRef,
  onJumpToGame,onReturnToGame,onOpenSort,onChangeTab,
}:Props){
  const [letter,setLetter]=useState<string>("#");
  const [popup,setPopup]=useState<string|null>(null);
  const [choosing,setChoosing]=useState(false);
  const [choice,setChoice]=useState<string|null>(null);
  const current=useRef<string|null>(null);
  const focusTime=useRef(0);
  const popupTimer=useRef<number|null>(null);
  const scrollFrame=useRef<number|null>(null);
  const activePointer=useRef<{id:number;letter:string|null}|null>(null);
  // A touch may also synthesize a click. Do not let Decky's onActivate
  // jump a second time after our pointer-up already committed the jump.
  const suppressTouchActivateUntil=useRef(0);
  const order=useMemo(()=>alphabetLetters(descending),[descending]);
  const targets=useMemo(()=>firstGameByLetter(allGames),[allGames]);

  const showPopup=(next:string)=>{
    setPopup(next);
    if(popupTimer.current!==null)window.clearTimeout(popupTimer.current);
    popupTimer.current=window.setTimeout(()=>{
      setPopup(null);
      popupTimer.current=null;
    },850);
  };
  const setCurrent=(index:number,announce:boolean)=>{
    if(index<0||index>=games.length)return;
    const next=letterForTitle(games[index].title);
    if(current.current===next)return;
    const previous=current.current;
    current.current=next;
    setLetter(next);
    if(announce&&previous!==null)showPopup(next);
  };

  useEffect(()=>{
    if(focusedGameId===undefined&&focusedGameKey===undefined)return;
    const index=games.findIndex(g=>focusedGameKey!==undefined?
      g.key===focusedGameKey:g.id===focusedGameId);
    if(index<0)return;
    focusTime.current=Date.now();
    setCurrent(index,true);
  },[focusedGameId,focusedGameKey,games]);

  useEffect(()=>{
    const scroll=scrollRef.current;
    const grid=gridRef.current;
    if(!scroll||!grid||!games.length)return;
    let active=true;

    const rowIndexAtViewport=():number=>{
      const columns=Math.max(1,getGridColumnCount(grid));
      const visibleTop=scroll.getBoundingClientRect().top+6;
      const children=grid.children;
      // Only inspect one card per rendered row, not every cover.
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
        // Programmatic scrollIntoView follows gamepad focus; retain its game
        // letter rather than briefly reporting the row above.
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
    };
  },[games,scrollRef,gridRef]);

  useEffect(()=>()=>{if(popupTimer.current!==null)
    window.clearTimeout(popupTimer.current);},[]);

  const onRailFocus=()=>{
    setChoosing(true);
    const selected=allGames.find(g=>focusedGameKey!==undefined?
      g.key===focusedGameKey:g.id===focusedGameId);
    const initial=selected?letterForTitle(selected.title):letter;
    setChoice(targets.has(initial)?initial:
      order.find(char=>targets.has(char))??null);
  };
  const leaveRail=()=>{
    setChoosing(false);
    setChoice(null);
  };
  const returnToGrid=()=>{
    leaveRail();
    setPopup(null);
    if(popupTimer.current!==null)window.clearTimeout(popupTimer.current);
    onReturnToGame();
  };
  const jumpToLetter=()=>{
    if(activePointer.current||Date.now()<suppressTouchActivateUntil.current)return;
    const target=choice!==null?targets.get(choice):undefined;
    if(target===undefined)returnToGrid();
    else{
      leaveRail();
      onJumpToGame(target);
    }
  };
  const onRailButton=(e:GamepadEvent)=>{
    const button=e.detail?.button;
    if(button===GamepadButton.DIR_UP||button===GamepadButton.DIR_DOWN){
      e.preventDefault();e.stopPropagation();
      const direction: -1|1=button===GamepadButton.DIR_UP?-1:1;
      const next=nextPopulatedLetter(choice??letter,direction,order,targets);
      if(next!==(choice??letter)){setChoice(next);showPopup(next);}
    }else if(button===GamepadButton.DIR_LEFT){
      e.preventDefault();e.stopPropagation();
      returnToGrid();
    }else if(button===GamepadButton.DIR_RIGHT){
      e.preventDefault();e.stopPropagation();
      // Last focus column. No implicit wrap into Steam's status bar.
    }else if(button===GamepadButton.BUMPER_LEFT||
      button===GamepadButton.BUMPER_RIGHT){
      e.preventDefault();e.stopPropagation();
      onChangeTab(button===GamepadButton.BUMPER_LEFT?-1:1);
    }
  };
  /** A tap commits its letter on release; a drag previews each letter
   * crossed, then commits on release. Pointer capture keeps tracking even
   * when the user's finger leaves the narrow right-side rail.
   */
  const letterUnderPointer=(event:ReactPointerEvent<HTMLDivElement>):string|null=>{
    const node=event.currentTarget;
    const rect=node.getBoundingClientRect();
    const computed=window.getComputedStyle(node);
    const raw=letterAtRailPosition(event.clientY,rect.top,rect.height,order,
      parseFloat(computed.paddingTop)||0,parseFloat(computed.paddingBottom)||0);
    return raw===null?null:nearestPopulatedLetter(raw,order,targets);
  };
  const previewPointerLetter=(next:string)=>{
    const pointer=activePointer.current;
    if(!pointer||pointer.letter===next)return;
    pointer.letter=next;
    setChoosing(true);
    setChoice(next);
    showPopup(next);
  };
  const onRailPointerDown=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(!event.isPrimary||event.button!==0||activePointer.current)return;
    const next=letterUnderPointer(event);
    if(next===null)return;
    event.preventDefault();
    event.stopPropagation();
    activePointer.current={id:event.pointerId,letter:null};
    suppressTouchActivateUntil.current=Date.now()+650;
    if(typeof event.currentTarget.setPointerCapture==="function"){
      try{event.currentTarget.setPointerCapture(event.pointerId);}catch{}
    }
    previewPointerLetter(next);
  };
  const onRailPointerMove=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(activePointer.current?.id!==event.pointerId)return;
    const next=letterUnderPointer(event);
    if(next!==null)previewPointerLetter(next);
  };
  const onRailPointerUp=(event:ReactPointerEvent<HTMLDivElement>)=>{
    const pointer=activePointer.current;
    if(!pointer||pointer.id!==event.pointerId)return;
    event.preventDefault();
    event.stopPropagation();
    const rect=event.currentTarget.getBoundingClientRect();
    // Deliberately releasing well outside the rail cancels the jump.
    const outside=event.clientX<rect.left-24||event.clientX>rect.right+24;
    const next=outside?null:letterUnderPointer(event);
    const selected=outside?null:(next??pointer.letter);
    activePointer.current=null;
    suppressTouchActivateUntil.current=Date.now()+650;
    if(typeof event.currentTarget.releasePointerCapture==="function"){
      try{event.currentTarget.releasePointerCapture(event.pointerId);}catch{}
    }
    if(selected!==null){
      const target=targets.get(selected);
      if(target!==undefined){
        leaveRail();
        onJumpToGame(target);
        return;
      }
    }
    leaveRail();
  };
  const onRailPointerCancel=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(activePointer.current?.id!==event.pointerId)return;
    activePointer.current=null;
    suppressTouchActivateUntil.current=Date.now()+650;
    leaveRail(); // interrupted swipe must never open an unrelated game
  };
  const highlighted=choosing?(choice??letter):letter;

  return <>
    <Focusable
      ref={railRef}
      className={"gl-alphabet-rail"+(choosing?" gl-alphabet-choosing":"")}
      focusClassName="gl-alphabet-focused"
      noFocusRing
      onGamepadFocus={onRailFocus}
      onBlur={leaveRail}
      onActivate={jumpToLetter}
      onCancelButton={returnToGrid}
      onButtonDown={onRailButton}
      onPointerDown={onRailPointerDown}
      onPointerMove={onRailPointerMove}
      onPointerUp={onRailPointerUp}
      onPointerCancel={onRailPointerCancel}
      onOptionsButton={(e:GamepadEvent)=>{
        e.preventDefault();e.stopPropagation();onOpenSort();
      }}
      onOKActionDescription="Jump to selected letter"
      onOptionsActionDescription="Sort games"
      aria-label="Jump to letter">
      {order.map(char=><span key={char}
        className={"gl-alphabet-rail-letter"+
          (char===highlighted?" gl-alphabet-current":"")+
          (!targets.has(char)?" gl-alphabet-unavailable":"")}>
        {char}
      </span>)}
    </Focusable>
    <div aria-hidden="true" className={"gl-alphabet-popup"+
      (popup!==null?" gl-alphabet-popup-visible":"")}>
      {popup??letter}
    </div>
  </>;
}

import type {ReactNode,Ref} from "react";
import {MdCheckCircle} from "react-icons/md";

/** The exact card surface used by every store, independent of where its
 * metadata/installation actions originate. Focusable/gamepad behavior lives
 * in the caller so native Steam menus are not changed. */
export function SharedLibraryCardFace({title,installed=false,children}:{
  title:string;installed?:boolean;children?:ReactNode;
}){
  return <div className="gl-poster">
    {children}
    <span className="gl-poster-name">{title}</span>
    {installed&&<MdCheckCircle className="gl-installed-indicator" aria-label="Installed"/>}
  </div>;
}

/** Reuse the exact Steam full-grid sizing, responsive breakpoints and scroll
 * container for GOG and all future store adapters. */
export function SharedLibraryGrid({children,scrollRef,gridRef}:{
  children:ReactNode;
  scrollRef?:Ref<HTMLDivElement>;
  gridRef?:Ref<HTMLDivElement>;
}){
  return <div className="gl-full-grid-scroll" ref={scrollRef}>
    <div className="gl-full-grid" ref={gridRef}>{children}</div>
  </div>;
}

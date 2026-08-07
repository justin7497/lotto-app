import { useEffect } from "react";

import { X } from "lucide-react";

import HomeSheetMenuTile from "@/components/HomeSheetMenuTile";

import { useHomeTheme } from "@/context/HomeThemeContext";

import { useOverlayBack } from "@/hooks/useOverlayBack";



export default function RecommendMethodsSheet({

  open,

  onClose,

}: {

  open: boolean;

  onClose: () => void;

}) {

  const { recommendMethodItems } = useHomeTheme();

  const closeSheet = useOverlayBack(open, onClose);



  useEffect(() => {

    if (!open) return;

    const prev = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {

      document.body.style.overflow = prev;

    };

  }, [open]);



  if (!open) return null;



  return (

    <div

      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50"

      role="presentation"

      onClick={closeSheet}

    >

      <div

        className="home-category-sheet home-category-sheet--menu"

        role="dialog"

        aria-modal

        aria-labelledby="recommend-methods-sheet-title"

        onClick={(e) => e.stopPropagation()}

      >

        <header className="home-category-sheet__header">

          <h2 id="recommend-methods-sheet-title" className="home-category-sheet__title">

            번호 만들기

          </h2>

          <button

            type="button"

            onClick={closeSheet}

            className="home-category-sheet__close"

            aria-label="닫기"

          >

            <X className="w-6 h-6" />

          </button>

        </header>



        <div className="home-category-sheet__body">

          <ul className="home-category-sheet__grid home-category-sheet__grid--quad">

            {recommendMethodItems.map((item) => (

              <li key={`${item.kind}-${item.label}`}>

                <HomeSheetMenuTile item={item} onNavigate={onClose} />

              </li>

            ))}

          </ul>

        </div>

      </div>

    </div>

  );

}



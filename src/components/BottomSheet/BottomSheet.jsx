import "./BottomSheet.css";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>

      {isOpen && (

        <motion.div
          className="sheet-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >

          <motion.div
            className="sheet-overlay"
            onClick={onClose}
          />

          <motion.div
            className="bottom-sheet"
            initial={{
              y: "100%",
            }}
            animate={{
              y: 0,
            }}
            exit={{
              y: "100%",
            }}
            transition={{
              type: "spring",
              damping: 28,
              stiffness: 260,
            }}
          >

            <div className="sheet-grabber" />

            <div className="sheet-header">

              <h2>{title}</h2>

              <button
                className="close-btn"
                onClick={onClose}
              >
                <X size={18} />
              </button>

            </div>

            <div className="sheet-content">

              {children}

            </div>

          </motion.div>

        </motion.div>

      )}

    </AnimatePresence>
  );
}

export default BottomSheet;
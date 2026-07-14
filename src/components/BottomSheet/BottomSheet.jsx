import "./BottomSheet.css";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
}) {
  return (
    <AnimatePresence>

      {isOpen && (

        <>

          <motion.div
            className="sheet-overlay"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="bottom-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 24,
              stiffness: 250,
            }}
          >

            <div className="sheet-header">

              <div className="sheet-handle" />

              <button
                className="close-btn"
                onClick={onClose}
              >
                <X size={20} />
              </button>

            </div>

            <h2>{title}</h2>

            <div className="sheet-content">

              {children}

            </div>

          </motion.div>

        </>

      )}

    </AnimatePresence>
  );
}

export default BottomSheet;
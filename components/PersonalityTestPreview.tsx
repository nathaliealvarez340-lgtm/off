"use client";

import { motion } from "framer-motion";
import { useOffLanguage } from "@/components/useOffLanguage";

export function PersonalityTestPreview() {
  const { t } = useOffLanguage();

  return (
    <div className="personality-test-preview">
      <motion.div
        className="test-card-shell"
        initial={{ opacity: 0, transform: "translateY(16px)" }}
        whileInView={{ opacity: 1, transform: "translateY(0)" }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="test-state-row">
          <span>Inicio</span>
          <span>Preguntas</span>
          <span>Resultado</span>
        </div>
        <div className="test-question-placeholder">
          <small>Pregunta temporal</small>
          <p>La estructura está lista para conectar el test cuando existan preguntas y parámetros definitivos.</p>
        </div>
        <button type="button">{t("startTest")}</button>
      </motion.div>
    </div>
  );
}

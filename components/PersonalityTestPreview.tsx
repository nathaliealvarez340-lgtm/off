"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

type Category = "comparison" | "clarity" | "execution" | "exhaustion";
type ProfileId = "builder" | "explorer" | "comparer" | "survivor" | "strategist";

type Question = {
  id: number;
  text: string;
  category: Category;
  positive?: boolean;
};

type Profile = {
  id: ProfileId;
  name: string;
  description: string;
  recommendation: string;
};

const QUESTIONS: Question[] = [
  { id: 1, text: "Siento que voy atrasado respecto a personas de mi edad.", category: "comparison" },
  { id: 2, text: "Me cuesta disfrutar mis logros porque inmediatamente pienso en lo que me falta.", category: "comparison" },
  { id: 3, text: "Tengo objetivos claros para los próximos 12 meses.", category: "clarity", positive: true },
  { id: 4, text: "Sé exactamente qué habilidades estoy desarrollando actualmente.", category: "clarity", positive: true },
  { id: 5, text: "Paso más tiempo planeando que ejecutando.", category: "execution" },
  { id: 6, text: "Me siento agotado aunque no haya hecho algo físicamente demandante.", category: "exhaustion" },
  { id: 7, text: "Comparo mis avances con los de otras personas.", category: "comparison" },
  { id: 8, text: "Tengo hábitos que me acercan a mis metas.", category: "execution", positive: true },
  { id: 9, text: "Cambio constantemente de objetivo.", category: "exhaustion" },
  { id: 10, text: "Siento que estoy construyendo una vida alineada con quien quiero ser.", category: "clarity", positive: true },
  { id: 11, text: "Me cuesta tomar decisiones importantes.", category: "exhaustion" },
  { id: 12, text: "Tengo claridad sobre mi propósito actual.", category: "clarity", positive: true },
  { id: 13, text: "Consumo mucho contenido de productividad pero aplico poco.", category: "execution" },
  { id: 14, text: "Me siento emocionalmente estable la mayor parte del tiempo.", category: "exhaustion", positive: true },
  { id: 15, text: "Si siguiera igual durante 5 años, me sentiría satisfecho con el resultado.", category: "clarity", positive: true },
];

const PROFILES: Record<ProfileId, Profile> = {
  builder: {
    id: "builder",
    name: "El Constructor",
    description:
      "Tienes estructura, dirección y hábitos consistentes. Tu reto no es empezar, sino sostener el crecimiento sin convertir tu vida en una fábrica de exigencia.",
    recommendation: "Lee contenido sobre sostenibilidad del éxito, límites y ambición inteligente.",
  },
  explorer: {
    id: "explorer",
    name: "El Explorador",
    description:
      "Tienes potencial, curiosidad y movimiento, pero todavía te falta dirección. No necesitas más opciones; necesitas criterio para elegir.",
    recommendation: "Empieza por contenido sobre claridad, toma de decisiones y diseño de vida.",
  },
  comparer: {
    id: "comparer",
    name: "El Comparador",
    description:
      "Tu energía se está filtrando por mirar demasiado el avance de otros. Tu reto es dejar de usar vidas ajenas como regla para medir tu propio proceso.",
    recommendation: "Ve a los artículos sobre comparación, presión social y validación externa.",
  },
  survivor: {
    id: "survivor",
    name: "El Sobreviviente",
    description:
      "Estás funcionando, pero no necesariamente viviendo con claridad. Tu mente está en modo resistencia. Necesitas recuperar energía, orden y sentido.",
    recommendation: "Prioriza contenido sobre agotamiento mental, reconstrucción emocional y sentido.",
  },
  strategist: {
    id: "strategist",
    name: "El Estratega",
    description:
      "Piensas mucho, analizas mucho y probablemente entiendes más de lo que ejecutas. Tu reto es convertir claridad mental en acción visible.",
    recommendation: "Entra a contenido sobre ejecución, disciplina real y decisiones imperfectas.",
  },
};

const CATEGORY_LABELS: Record<Category, string> = {
  comparison: "Comparación",
  clarity: "Claridad",
  execution: "Ejecución",
  exhaustion: "Agotamiento",
};

const SCALE_LABELS: Record<number, string> = {
  1: "Nada",
  2: "Poco",
  3: "Neutral",
  4: "Mucho",
  5: "Totalmente",
};

function getBlockageScore(question: Question, answer: number) {
  return question.positive ? 6 - answer : answer;
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getLevel(score: number) {
  if (score <= 2.2) {
    return "Bajo";
  }

  if (score <= 3.4) {
    return "Medio";
  }

  return "Alto";
}

function getProfile(scores: Record<Category, number>): Profile {
  const entries = Object.entries(scores) as Array<[Category, number]>;
  const maxScore = Math.max(...entries.map(([, score]) => score));
  const dominant = entries.filter(([, score]) => score === maxScore).map(([category]) => category);

  if (dominant.includes("comparison")) {
    return PROFILES.comparer;
  }

  if (dominant.includes("exhaustion")) {
    return PROFILES.survivor;
  }

  const clarityIsStrong = scores.clarity <= 2.2;
  const executionIsStrong = scores.execution <= 2.3;
  const clarityIsBlocked = scores.clarity >= 3.2;
  const executionIsBlocked = scores.execution >= 3.2;

  if (clarityIsStrong && executionIsStrong) {
    return PROFILES.builder;
  }

  if (clarityIsBlocked) {
    return PROFILES.explorer;
  }

  if (executionIsBlocked && clarityIsStrong) {
    return PROFILES.strategist;
  }

  if (executionIsBlocked) {
    return PROFILES.strategist;
  }

  return PROFILES.explorer;
}

export function PersonalityTestPreview() {
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState("");

  const answeredCount = Object.keys(answers).length;
  const currentQuestion = QUESTIONS[currentIndex];
  const progress = Math.round((answeredCount / QUESTIONS.length) * 100);
  const isComplete = answeredCount === QUESTIONS.length;

  const result = useMemo(() => {
    const groupedScores: Record<Category, number[]> = {
      comparison: [],
      clarity: [],
      execution: [],
      exhaustion: [],
    };

    QUESTIONS.forEach((question) => {
      const answer = answers[question.id];

      if (!answer) {
        return;
      }

      groupedScores[question.category].push(getBlockageScore(question, answer));
    });

    const categoryScores: Record<Category, number> = {
      comparison: average(groupedScores.comparison),
      clarity: average(groupedScores.clarity),
      execution: average(groupedScores.execution),
      exhaustion: average(groupedScores.exhaustion),
    };

    const profile = getProfile(categoryScores);
    const globalScore = average(Object.values(categoryScores).filter(Boolean));
    const indexScore = Math.round(globalScore * 20);

    return {
      categoryScores,
      indexScore,
      level: getLevel(globalScore),
      profile,
    };
  }, [answers]);

  function handleAnswer(value: number) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [currentQuestion.id]: value,
    }));
    setError("");
  }

  function handleNext() {
    if (!answers[currentQuestion.id]) {
      setError("Responde esta pregunta antes de avanzar.");
      return;
    }

    setError("");
    setCurrentIndex((index) => Math.min(index + 1, QUESTIONS.length - 1));
  }

  function handleBack() {
    setError("");
    setCurrentIndex((index) => Math.max(index - 1, 0));
  }

  function handleSubmit() {
    if (!isComplete) {
      const firstMissingIndex = QUESTIONS.findIndex((question) => !answers[question.id]);
      setCurrentIndex(firstMissingIndex >= 0 ? firstMissingIndex : currentIndex);
      setError("Completa todas las preguntas para ver tu resultado.");
      return;
    }

    setError("");
    setShowResult(true);
  }

  function handleReset() {
    setAnswers({});
    setCurrentIndex(0);
    setError("");
    setShowResult(false);
    setStarted(false);
  }

  return (
    <div className="personality-test-preview" aria-labelledby="off-index-title">
      <motion.div
        className="off-index-shell"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="off-index-header">
          <span>Test privado</span>
          <h2 id="off-index-title">OFF Index™</h2>
          <p>¿Qué está frenando tu crecimiento en tus 20s?</p>
          <small>No es diagnóstico. Es un espejo incómodo, que aparentemente hacía falta.</small>
        </div>

        {!started ? (
          <motion.div
            className="off-index-intro"
            initial={{ opacity: 0, transform: "translateY(16px)" }}
            animate={{ opacity: 1, transform: "translateY(0)" }}
            transition={{ duration: 0.46, ease: [0.23, 1, 0.32, 1] }}
          >
            <p>Antes de seguir construyendo tu futuro, vale la pena entender desde dónde estás tomando tus decisiones.</p>
            <p>Este test privado fue diseñado para ayudarte a reconocer patrones, fortalezas y comportamientos que normalmente pasan desapercibidos mientras intentas crecer.</p>
            <p>No existen respuestas correctas.</p>
            <p>Existe una versión más consciente de ti.</p>
            <strong>Bienvenido a tu Modo ON.</strong>
            <button type="button" className="off-index-primary-button" onClick={() => setStarted(true)}>
              Iniciar
            </button>
          </motion.div>
        ) : !showResult ? (
          <>
            <div className="off-index-progress" aria-label={`Progreso ${progress}%`}>
              <div className="off-index-progress-copy">
                <span>
                  Pregunta {currentIndex + 1} de {QUESTIONS.length}
                </span>
                <span>{progress}% completo</span>
              </div>
              <div className="off-index-progress-track">
                <motion.div
                  className="off-index-progress-bar"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </div>
            </div>

            <motion.div
              key={currentQuestion.id}
              className="off-index-question-card"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <span className="off-index-category">{CATEGORY_LABELS[currentQuestion.category]}</span>
              <p>{currentQuestion.text}</p>
              <div className="off-index-scale" role="radiogroup" aria-label={currentQuestion.text}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={answers[currentQuestion.id] === value ? "is-selected" : ""}
                    aria-checked={answers[currentQuestion.id] === value}
                    role="radio"
                    onClick={() => handleAnswer(value)}
                  >
                    <strong>{value}</strong>
                    <span>{SCALE_LABELS[value]}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {error ? <p className="off-index-error">{error}</p> : null}

            <div className="off-index-actions">
              <button type="button" className="off-index-ghost-button" onClick={handleBack} disabled={currentIndex === 0}>
                Anterior
              </button>
              {currentIndex < QUESTIONS.length - 1 ? (
                <button type="button" className="off-index-primary-button" onClick={handleNext}>
                  Siguiente
                </button>
              ) : (
                <button type="button" className="off-index-primary-button" onClick={handleSubmit} disabled={!isComplete}>
                  Ver mi resultado
                </button>
              )}
            </div>
          </>
        ) : (
          <motion.div
            className="off-index-result"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: "easeOut" }}
          >
            <span>Tu resultado principal</span>
            <h3>{result.profile.name}</h3>
            <div className="off-index-result-meta">
              <span>Nivel de bloqueo: {result.level}</span>
              <span>Índice OFF: {result.indexScore}/100</span>
            </div>
            <p>{result.profile.description}</p>
            <div className="off-index-recommendation">
              <strong>Recomendación</strong>
              <p>{result.profile.recommendation}</p>
            </div>
            <div className="off-index-breakdown" aria-label="Lectura por dimensiones">
              {(Object.entries(result.categoryScores) as Array<[Category, number]>).map(([category, score]) => (
                <div key={category}>
                  <span>{CATEGORY_LABELS[category]}</span>
                  <strong>{getLevel(score)}</strong>
                </div>
              ))}
            </div>
            <button type="button" className="off-index-ghost-button" onClick={handleReset}>
              Repetir test
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

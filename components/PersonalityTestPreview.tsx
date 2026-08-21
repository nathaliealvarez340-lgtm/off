"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useOffLanguage } from "@/components/useOffLanguage";
import type { UiLanguage } from "@/lib/ui-i18n";

type Category = "comparison" | "clarity" | "execution" | "exhaustion";
type ProfileId = "builder" | "explorer" | "comparer" | "survivor" | "strategist";

type Question = {
  id: number;
  category: Category;
  positive?: boolean;
};

type ProfileCopy = {
  name: string;
  description: string;
  recommendation: string;
};

const QUESTIONS: Question[] = [
  { id: 1, category: "comparison" }, { id: 2, category: "comparison" },
  { id: 3, category: "clarity", positive: true }, { id: 4, category: "clarity", positive: true },
  { id: 5, category: "execution" }, { id: 6, category: "exhaustion" },
  { id: 7, category: "comparison" }, { id: 8, category: "execution", positive: true },
  { id: 9, category: "exhaustion" }, { id: 10, category: "clarity", positive: true },
  { id: 11, category: "exhaustion" }, { id: 12, category: "clarity", positive: true },
  { id: 13, category: "execution" }, { id: 14, category: "exhaustion", positive: true },
  { id: 15, category: "clarity", positive: true },
];

type IndexCopy = {
  title: string; privateTest: string; prompt: string; disclaimer: string; intro: string; welcome: string; start: string;
  question: string; of: string; complete: string; progress: string; answerError: string; completeError: string;
  previous: string; next: string; showResult: string; mainResult: string; blockage: string; index: string;
  recommendation: string; dimensions: string; repeat: string;
  categories: Record<Category, string>; scale: Record<number, string>; levels: [string, string, string];
  questions: string[]; profiles: Record<ProfileId, ProfileCopy>;
};

const INDEX_COPY: Record<UiLanguage, IndexCopy> = {
  es: {
    title: "Mi diagnóstico", privateTest: "Test privado", prompt: "¿Qué está frenando tu crecimiento en tus 20s?", disclaimer: "No es diagnóstico. Es un espejo incómodo, que aparentemente hacía falta.",
    intro: "Antes de seguir construyendo, entiende cómo estás funcionando hoy: patrones, fortalezas y tensiones que suelen pasar desapercibidas.", welcome: "Bienvenido a tu Modo ON.", start: "Iniciar",
    question: "Pregunta", of: "de", complete: "completo", progress: "Progreso", answerError: "Responde esta pregunta antes de avanzar.", completeError: "Completa todas las preguntas para ver tu resultado.",
    previous: "Anterior", next: "Siguiente", showResult: "Ver mi resultado", mainResult: "Tu resultado principal", blockage: "Nivel de bloqueo", index: "Índice OFF", recommendation: "Recomendación", dimensions: "Lectura por dimensiones", repeat: "Repetir test",
    categories: { comparison: "Comparación", clarity: "Claridad", execution: "Ejecución", exhaustion: "Agotamiento" }, scale: { 1: "Nada", 2: "Poco", 3: "Neutral", 4: "Mucho", 5: "Totalmente" }, levels: ["Bajo", "Medio", "Alto"],
    questions: ["Siento que voy atrasado respecto a personas de mi edad.", "Me cuesta disfrutar mis logros porque inmediatamente pienso en lo que me falta.", "Tengo objetivos claros para los próximos 12 meses.", "Sé exactamente qué habilidades estoy desarrollando actualmente.", "Paso más tiempo planeando que ejecutando.", "Me siento agotado aunque no haya hecho algo físicamente demandante.", "Comparo mis avances con los de otras personas.", "Tengo hábitos que me acercan a mis metas.", "Cambio constantemente de objetivo.", "Siento que estoy construyendo una vida alineada con quien quiero ser.", "Me cuesta tomar decisiones importantes.", "Tengo claridad sobre mi propósito actual.", "Consumo mucho contenido de productividad pero aplico poco.", "Me siento emocionalmente estable la mayor parte del tiempo.", "Si siguiera igual durante 5 años, me sentiría satisfecho con el resultado."],
    profiles: {
      builder: { name: "El Constructor", description: "Tienes estructura, dirección y hábitos consistentes. Tu reto es sostener el crecimiento sin convertir tu vida en una fábrica de exigencia.", recommendation: "Lee sobre sostenibilidad del éxito, límites y ambición inteligente." },
      explorer: { name: "El Explorador", description: "Tienes potencial y movimiento, pero todavía te falta dirección. No necesitas más opciones; necesitas criterio para elegir.", recommendation: "Empieza por claridad, toma de decisiones y diseño de vida." },
      comparer: { name: "El Comparador", description: "Tu energía se filtra al mirar demasiado el avance de otros. Deja de usar vidas ajenas como regla para medir tu proceso.", recommendation: "Ve a comparación, presión social y validación externa." },
      survivor: { name: "El Sobreviviente", description: "Estás funcionando, pero no necesariamente viviendo con claridad. Necesitas recuperar energía, orden y sentido.", recommendation: "Prioriza agotamiento mental, reconstrucción emocional y sentido." },
      strategist: { name: "El Estratega", description: "Piensas y analizas más de lo que ejecutas. Tu reto es convertir claridad mental en acción visible.", recommendation: "Entra a ejecución, disciplina real y decisiones imperfectas." },
    },
  },
  en: {
    title: "My diagnosis",
    privateTest: "Private test", prompt: "What is holding back your growth in your twenties?", disclaimer: "This is not a diagnosis. It is an honest mirror.", intro: "Before you keep building, understand how you are operating today: patterns, strengths and tensions that often go unnoticed.", welcome: "Welcome to your ON Mode.", start: "Start",
    question: "Question", of: "of", complete: "complete", progress: "Progress", answerError: "Answer this question before continuing.", completeError: "Complete every question to see your result.", previous: "Previous", next: "Next", showResult: "See my result", mainResult: "Your main result", blockage: "Blockage level", index: "OFF Index", recommendation: "Recommendation", dimensions: "Reading by dimension", repeat: "Retake test",
    categories: { comparison: "Comparison", clarity: "Clarity", execution: "Execution", exhaustion: "Exhaustion" }, scale: { 1: "Not at all", 2: "A little", 3: "Neutral", 4: "A lot", 5: "Completely" }, levels: ["Low", "Medium", "High"],
    questions: ["I feel behind other people my age.", "I struggle to enjoy achievements because I immediately think about what is missing.", "I have clear goals for the next 12 months.", "I know which skills I am currently developing.", "I spend more time planning than executing.", "I feel exhausted even without physical strain.", "I compare my progress with other people's.", "I have habits that move me toward my goals.", "I constantly change goals.", "I feel I am building a life aligned with who I want to be.", "I struggle to make important decisions.", "I am clear about my current purpose.", "I consume a lot of productivity content but apply little.", "I feel emotionally stable most of the time.", "If I continued this way for five years, I would be satisfied with the result."],
    profiles: {
      builder: { name: "The Builder", description: "You have structure, direction and consistent habits. Your challenge is sustainable growth without turning life into constant pressure.", recommendation: "Read about sustainable success, boundaries and intelligent ambition." },
      explorer: { name: "The Explorer", description: "You have potential and movement, but still need direction. You need criteria, not more options.", recommendation: "Start with clarity, decision-making and life design." },
      comparer: { name: "The Comparer", description: "Your energy leaks into watching other people's progress. Stop using other lives to measure your own process.", recommendation: "Explore comparison, social pressure and external validation." },
      survivor: { name: "The Survivor", description: "You are functioning, but not necessarily living with clarity. Recover energy, order and meaning.", recommendation: "Prioritize mental exhaustion, emotional rebuilding and meaning." },
      strategist: { name: "The Strategist", description: "You think and analyze more than you execute. Turn mental clarity into visible action.", recommendation: "Explore execution, real discipline and imperfect decisions." },
    },
  },
  it: {
    title: "La mia diagnosi",
    privateTest: "Test privato", prompt: "Cosa sta frenando la tua crescita nei tuoi vent'anni?", disclaimer: "Non è una diagnosi. È uno specchio onesto.", intro: "Prima di continuare a costruire, comprendi come stai funzionando oggi: schemi, punti di forza e tensioni invisibili.", welcome: "Benvenuto nel tuo Modo ON.", start: "Inizia",
    question: "Domanda", of: "di", complete: "completo", progress: "Progresso", answerError: "Rispondi prima di continuare.", completeError: "Completa tutte le domande per vedere il risultato.", previous: "Indietro", next: "Avanti", showResult: "Vedi il risultato", mainResult: "Il tuo risultato principale", blockage: "Livello di blocco", index: "Indice OFF", recommendation: "Consiglio", dimensions: "Lettura per dimensione", repeat: "Ripeti il test",
    categories: { comparison: "Confronto", clarity: "Chiarezza", execution: "Esecuzione", exhaustion: "Esaurimento" }, scale: { 1: "Per niente", 2: "Poco", 3: "Neutro", 4: "Molto", 5: "Totalmente" }, levels: ["Basso", "Medio", "Alto"],
    questions: ["Mi sento indietro rispetto ai miei coetanei.", "Faccio fatica a godermi i risultati perché penso subito a ciò che manca.", "Ho obiettivi chiari per i prossimi 12 mesi.", "So quali competenze sto sviluppando.", "Passo più tempo a pianificare che ad agire.", "Mi sento stanco anche senza sforzo fisico.", "Confronto i miei progressi con quelli degli altri.", "Ho abitudini che mi avvicinano ai miei obiettivi.", "Cambio continuamente obiettivo.", "Sto costruendo una vita allineata con chi voglio essere.", "Faccio fatica a prendere decisioni importanti.", "Ho chiarezza sul mio scopo attuale.", "Consumo molti contenuti di produttività ma applico poco.", "Mi sento emotivamente stabile per la maggior parte del tempo.", "Se continuassi così per cinque anni, sarei soddisfatto."],
    profiles: {
      builder: { name: "Il Costruttore", description: "Hai struttura, direzione e abitudini costanti. La sfida è crescere senza trasformare la vita in pressione continua.", recommendation: "Leggi di successo sostenibile, limiti e ambizione intelligente." },
      explorer: { name: "L'Esploratore", description: "Hai potenziale e movimento, ma ti manca ancora direzione. Ti serve criterio, non più opzioni.", recommendation: "Inizia da chiarezza, decisioni e design di vita." },
      comparer: { name: "Il Comparatore", description: "La tua energia si disperde guardando i progressi altrui. Non usare vite altrui per misurare la tua.", recommendation: "Esplora confronto, pressione sociale e validazione esterna." },
      survivor: { name: "Il Sopravvissuto", description: "Stai funzionando, ma non necessariamente vivendo con chiarezza. Recupera energia, ordine e senso.", recommendation: "Dai priorità a stanchezza mentale, ricostruzione emotiva e senso." },
      strategist: { name: "Lo Stratega", description: "Pensi e analizzi più di quanto agisci. Trasforma la chiarezza mentale in azione visibile.", recommendation: "Esplora esecuzione, disciplina reale e decisioni imperfette." },
    },
  },
  pt: {
    title: "Meu diagnóstico", privateTest: "Teste privado", prompt: "O que está bloqueando seu crescimento nos seus 20 anos?", disclaimer: "Não é diagnóstico. É um espelho honesto.", intro: "Antes de continuar construindo, entenda como você funciona hoje: padrões, forças e tensões que passam despercebidas.", welcome: "Bem-vindo ao seu Modo ON.", start: "Começar",
    question: "Pergunta", of: "de", complete: "concluído", progress: "Progresso", answerError: "Responda antes de avançar.", completeError: "Complete todas as perguntas para ver o resultado.", previous: "Anterior", next: "Próxima", showResult: "Ver resultado", mainResult: "Seu resultado principal", blockage: "Nível de bloqueio", index: "Índice OFF", recommendation: "Recomendação", dimensions: "Leitura por dimensão", repeat: "Refazer teste",
    categories: { comparison: "Comparação", clarity: "Clareza", execution: "Execução", exhaustion: "Esgotamento" }, scale: { 1: "Nada", 2: "Pouco", 3: "Neutro", 4: "Muito", 5: "Totalmente" }, levels: ["Baixo", "Médio", "Alto"],
    questions: ["Sinto que estou atrasado em relação a pessoas da minha idade.", "Tenho dificuldade de aproveitar conquistas porque penso no que falta.", "Tenho objetivos claros para os próximos 12 meses.", "Sei quais habilidades estou desenvolvendo.", "Passo mais tempo planejando do que executando.", "Sinto cansaço mesmo sem esforço físico.", "Comparo meu progresso com o de outras pessoas.", "Tenho hábitos que me aproximam das metas.", "Mudo de objetivo constantemente.", "Estou construindo uma vida alinhada com quem quero ser.", "Tenho dificuldade para tomar decisões importantes.", "Tenho clareza sobre meu propósito atual.", "Consumo muito conteúdo de produtividade, mas aplico pouco.", "Sinto estabilidade emocional na maior parte do tempo.", "Se continuasse assim por cinco anos, ficaria satisfeito."],
    profiles: {
      builder: { name: "O Construtor", description: "Você tem estrutura, direção e hábitos consistentes. O desafio é crescer sem transformar a vida em pressão constante.", recommendation: "Leia sobre sucesso sustentável, limites e ambição inteligente." },
      explorer: { name: "O Explorador", description: "Você tem potencial e movimento, mas ainda precisa de direção. Precisa de critério, não de mais opções.", recommendation: "Comece por clareza, decisões e design de vida." },
      comparer: { name: "O Comparador", description: "Sua energia se perde ao olhar o progresso alheio. Não use outras vidas para medir seu processo.", recommendation: "Explore comparação, pressão social e validação externa." },
      survivor: { name: "O Sobrevivente", description: "Você está funcionando, mas não necessariamente vivendo com clareza. Recupere energia, ordem e sentido.", recommendation: "Priorize esgotamento mental, reconstrução emocional e sentido." },
      strategist: { name: "O Estrategista", description: "Você pensa e analisa mais do que executa. Transforme clareza mental em ação visível.", recommendation: "Explore execução, disciplina real e decisões imperfeitas." },
    },
  },
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

function getLevel(score: number, levels: IndexCopy["levels"]) {
  if (score <= 2.2) {
    return levels[0];
  }

  if (score <= 3.4) {
    return levels[1];
  }

  return levels[2];
}

function getProfile(scores: Record<Category, number>): ProfileId {
  const entries = Object.entries(scores) as Array<[Category, number]>;
  const maxScore = Math.max(...entries.map(([, score]) => score));
  const dominant = entries.filter(([, score]) => score === maxScore).map(([category]) => category);

  if (dominant.includes("comparison")) {
    return "comparer";
  }

  if (dominant.includes("exhaustion")) {
    return "survivor";
  }

  const clarityIsStrong = scores.clarity <= 2.2;
  const executionIsStrong = scores.execution <= 2.3;
  const clarityIsBlocked = scores.clarity >= 3.2;
  const executionIsBlocked = scores.execution >= 3.2;

  if (clarityIsStrong && executionIsStrong) {
    return "builder";
  }

  if (clarityIsBlocked) {
    return "explorer";
  }

  if (executionIsBlocked && clarityIsStrong) {
    return "strategist";
  }

  if (executionIsBlocked) {
    return "strategist";
  }

  return "explorer";
}

export function PersonalityTestPreview() {
  const { language } = useOffLanguage();
  const copy = INDEX_COPY[language];
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

    const profileId = getProfile(categoryScores);
    const globalScore = average(Object.values(categoryScores).filter(Boolean));
    const indexScore = Math.round(globalScore * 20);

    return {
      categoryScores,
      indexScore,
      level: getLevel(globalScore, copy.levels),
      profile: copy.profiles[profileId],
    };
  }, [answers, copy]);

  function handleAnswer(value: number) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [currentQuestion.id]: value,
    }));
    setError("");
  }

  function handleNext() {
    if (!answers[currentQuestion.id]) {
      setError(copy.answerError);
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
      setError(copy.completeError);
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
          <h2 id="off-index-title">{copy.title}</h2>
          <p>{copy.prompt}</p>
          <small>{copy.disclaimer}</small>
        </div>

        {!started ? (
          <motion.div
            className="off-index-intro"
            initial={{ opacity: 0, transform: "translateY(16px)" }}
            animate={{ opacity: 1, transform: "translateY(0)" }}
            transition={{ duration: 0.46, ease: [0.23, 1, 0.32, 1] }}
          >
            <p>{copy.intro}</p>
            <strong>{copy.welcome}</strong>
            <button type="button" className="off-index-primary-button" onClick={() => setStarted(true)}>
              {copy.start}
            </button>
          </motion.div>
        ) : !showResult ? (
          <>
            <div className="off-index-progress" aria-label={`${copy.progress} ${progress}%`}>
              <div className="off-index-progress-copy">
                <span>
                  {copy.question} {currentIndex + 1} {copy.of} {QUESTIONS.length}
                </span>
                <span>{progress}% {copy.complete}</span>
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
              <span className="off-index-category">{copy.categories[currentQuestion.category]}</span>
              <p>{copy.questions[currentIndex]}</p>
              <div className="off-index-scale" role="radiogroup" aria-label={copy.questions[currentIndex]}>
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
                    <span>{copy.scale[value]}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {error ? <p className="off-index-error">{error}</p> : null}

            <div className="off-index-actions">
              <button type="button" className="off-index-ghost-button" onClick={handleBack} disabled={currentIndex === 0}>
                {copy.previous}
              </button>
              {currentIndex < QUESTIONS.length - 1 ? (
                <button type="button" className="off-index-primary-button" onClick={handleNext}>
                  {copy.next}
                </button>
              ) : (
                <button type="button" className="off-index-primary-button" onClick={handleSubmit} disabled={!isComplete}>
                  {copy.showResult}
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
            <span>{copy.mainResult}</span>
            <h3>{result.profile.name}</h3>
            <div className="off-index-result-meta">
              <span>{copy.blockage}: {result.level}</span>
              <span>{copy.index}: {result.indexScore}/100</span>
            </div>
            <p>{result.profile.description}</p>
            <div className="off-index-recommendation">
              <strong>{copy.recommendation}</strong>
              <p>{result.profile.recommendation}</p>
            </div>
            <div className="off-index-breakdown" aria-label={copy.dimensions}>
              {(Object.entries(result.categoryScores) as Array<[Category, number]>).map(([category, score]) => (
                <div key={category}>
                  <span>{copy.categories[category]}</span>
                  <strong>{getLevel(score, copy.levels)}</strong>
                </div>
              ))}
            </div>
            <button type="button" className="off-index-ghost-button" onClick={handleReset}>
              {copy.repeat}
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

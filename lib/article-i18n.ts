import { stripHtml } from "./articles";

export type ArticleLanguage = "es" | "en" | "it" | "pt";

export type ArticleTranslation = {
  title: string;
  excerpt: string;
  content: string;
  category?: string;
};

type ArticleTranslationEnvelope = {
  type: "off-article-translations";
  originalLanguage?: ArticleLanguage;
  translations?: Partial<Record<ArticleLanguage, Partial<ArticleTranslation>>>;
};

export const articleLanguages: Array<{ code: ArticleLanguage; label: string }> = [
  { code: "es", label: "ES" },
  { code: "en", label: "EN" },
  { code: "it", label: "IT" },
  { code: "pt", label: "PT" },
];

export const articleUi = {
  es: {
    unavailable: "Este artículo aún no está disponible en este idioma.",
    save: "Guardar",
    saved: "Guardado",
    reader: "Lector interactivo",
    share: "Compartir",
    play: "Reproducir lectura",
    stop: "Detener lectura",
    speed: "Velocidad",
    voice: "Voz",
    woman: "Mujer",
    man: "Hombre",
    copy: "Copiar link",
    nativeShare: "Compartir desde dispositivo",
    chapters: "Capítulos", subscription: "Suscripción", lounge: "Member Lounge", logout: "Cerrar sesión",
    complete: "OFF completo", gateTitle: "Hay más detrás de esta historia.", gateCopy: "Suscríbete para seguir leyendo y descubrir nuevas formas de entender tus 20 y lo que pasa cuando dejamos de vivir en automático.", enterOff: "Entrar a OFF",
    privatePortfolio: "Portafolio privado", membersOnly: "Exclusivo para miembros", exercise: "Ejercicio", exerciseText: "Escribe qué parte de tu vida se ve bien por fuera, pero ya no se siente tuya.", journal: "Journaling prompt", journalText: "¿Qué decisión tomarías si no tuvieras que explicársela a nadie?", framework: "Framework", frameworkText: "Distingue entre lo que construyes por dirección y lo que sostienes por inercia.", note: "Guarda estas preguntas. No necesitas responderlas rápido; necesitas responderlas con honestidad.",
    listens: "OFF escucha", topicQuestion: "¿De qué te gustaría hablar en el próximo capítulo?", topicPlaceholder: "Escribe una idea o tensión...", send: "Enviar", privateRoom: "Sala privada", conversation: "OFF Conversations", shareReflection: "Compartir reflexión", story: "Tu historia también importa. Únete a OFF para compartir tus pensamientos, responder y formar parte de la conversación.", join: "Unirme", continueConversation: "Continuar conversación", replyPlaceholder: "Responder pensamiento...", reply: "Responder pensamiento",
  },
  en: {
    unavailable: "This article is not yet available in this language.",
    save: "Save",
    saved: "Saved",
    reader: "Interactive reader",
    share: "Share",
    play: "Play article",
    stop: "Stop reading",
    speed: "Speed",
    voice: "Voice",
    woman: "Woman",
    man: "Man",
    copy: "Copy link",
    nativeShare: "Share from device",
    chapters: "Chapters", subscription: "Subscription", lounge: "Member Lounge", logout: "Log out",
    complete: "Full OFF", gateTitle: "There is more behind this story.", gateCopy: "Subscribe to keep reading and find new ways to understand your twenties and what happens when we stop living on autopilot.", enterOff: "Enter OFF",
    privatePortfolio: "Private portfolio", membersOnly: "Members only", exercise: "Exercise", exerciseText: "Write which part of your life looks right from the outside but no longer feels like yours.", journal: "Journaling prompt", journalText: "What decision would you make if you did not have to explain it to anyone?", framework: "Framework", frameworkText: "Separate what you build with direction from what you sustain through inertia.", note: "Keep these questions. You do not need to answer quickly; answer honestly.",
    listens: "OFF listens", topicQuestion: "What would you like to discuss in the next chapter?", topicPlaceholder: "Write an idea or tension...", send: "Send", privateRoom: "Private room", conversation: "OFF Conversations", shareReflection: "Share a reflection", story: "Your story matters too. Join OFF to share your thoughts, reply and become part of the conversation.", join: "Join", continueConversation: "Continue conversation", replyPlaceholder: "Reply to this thought...", reply: "Reply",
  },
  it: {
    unavailable: "Questo articolo non è ancora disponibile in questa lingua.",
    save: "Salva",
    saved: "Salvato",
    reader: "Lettore interattivo",
    share: "Condividi",
    play: "Riproduci lettura",
    stop: "Interrompi lettura",
    speed: "Velocità",
    voice: "Voce",
    woman: "Donna",
    man: "Uomo",
    copy: "Copia link",
    nativeShare: "Condividi dal dispositivo",
    chapters: "Capitoli", subscription: "Iscrizione", lounge: "Member Lounge", logout: "Esci",
    complete: "OFF completo", gateTitle: "C'è altro dietro questa storia.", gateCopy: "Iscriviti per continuare a leggere e scoprire nuovi modi di comprendere i tuoi vent'anni e cosa accade quando smettiamo di vivere in automatico.", enterOff: "Entra in OFF",
    privatePortfolio: "Portfolio privato", membersOnly: "Solo per membri", exercise: "Esercizio", exerciseText: "Scrivi quale parte della tua vita sembra giusta da fuori ma non ti appartiene più.", journal: "Journaling prompt", journalText: "Quale decisione prenderesti se non dovessi spiegarla a nessuno?", framework: "Framework", frameworkText: "Distingui ciò che costruisci con direzione da ciò che sostieni per inerzia.", note: "Conserva queste domande. Non serve rispondere in fretta; serve rispondere con onestà.",
    listens: "OFF ascolta", topicQuestion: "Di cosa vorresti parlare nel prossimo capitolo?", topicPlaceholder: "Scrivi un'idea o una tensione...", send: "Invia", privateRoom: "Sala privata", conversation: "OFF Conversations", shareReflection: "Condividi una riflessione", story: "Anche la tua storia conta. Entra in OFF per condividere pensieri, rispondere e partecipare alla conversazione.", join: "Unisciti", continueConversation: "Continua la conversazione", replyPlaceholder: "Rispondi al pensiero...", reply: "Rispondi",
  },
  pt: {
    unavailable: "Este artigo ainda não está disponível neste idioma.",
    save: "Salvar",
    saved: "Salvo",
    reader: "Leitor interativo",
    share: "Compartilhar",
    play: "Reproduzir leitura",
    stop: "Parar leitura",
    speed: "Velocidade",
    voice: "Voz",
    woman: "Mulher",
    man: "Homem",
    copy: "Copiar link",
    nativeShare: "Compartilhar pelo dispositivo",
    chapters: "Capítulos", subscription: "Assinatura", lounge: "Member Lounge", logout: "Sair",
    complete: "OFF completo", gateTitle: "Há mais por trás desta história.", gateCopy: "Assine para continuar lendo e descobrir novas formas de entender seus 20 anos e o que acontece quando deixamos de viver no automático.", enterOff: "Entrar no OFF",
    privatePortfolio: "Portfólio privado", membersOnly: "Exclusivo para membros", exercise: "Exercício", exerciseText: "Escreva qual parte da sua vida parece certa por fora, mas já não parece sua.", journal: "Journaling prompt", journalText: "Que decisão você tomaria se não precisasse explicá-la a ninguém?", framework: "Framework", frameworkText: "Diferencie o que você constrói com direção do que mantém por inércia.", note: "Guarde estas perguntas. Você não precisa responder rápido; precisa responder com honestidade.",
    listens: "OFF escuta", topicQuestion: "Sobre o que você gostaria de falar no próximo capítulo?", topicPlaceholder: "Escreva uma ideia ou tensão...", send: "Enviar", privateRoom: "Sala privada", conversation: "OFF Conversations", shareReflection: "Compartilhar reflexão", story: "Sua história também importa. Entre no OFF para compartilhar pensamentos, responder e fazer parte da conversa.", join: "Entrar", continueConversation: "Continuar conversa", replyPlaceholder: "Responder pensamento...", reply: "Responder",
  },
} as const;

export function normalizeArticleLanguage(value?: string): ArticleLanguage {
  return value === "en" || value === "it" || value === "pt" ? value : "es";
}

export function resolveArticleTranslation(
  article: ArticleTranslation,
  requestedLanguage: ArticleLanguage,
) {
  let envelope: ArticleTranslationEnvelope | null = null;

  try {
    const parsed = JSON.parse(article.content) as ArticleTranslationEnvelope;
    if (parsed?.type === "off-article-translations" && parsed.translations) envelope = parsed;
  } catch {
    envelope = null;
  }

  const originalLanguage = envelope?.originalLanguage ?? "es";
  const original = envelope?.translations?.[originalLanguage];
  const requested = envelope?.translations?.[requestedLanguage];
  const base = {
    title: original?.title || article.title,
    excerpt: original?.excerpt || article.excerpt,
    content: original?.content || article.content,
    category: original?.category,
  };

  if (!requested || !requested.title || !requested.excerpt || !requested.content) {
    return {
      ...base,
      language: originalLanguage,
      requestedLanguage,
      hasTranslation: requestedLanguage === originalLanguage,
    };
  }

  return {
    title: requested.title,
    excerpt: requested.excerpt,
    content: requested.content,
    category: requested.category || base.category,
    language: requestedLanguage,
    requestedLanguage,
    hasTranslation: true,
  };
}

export function articleSpeechText(title: string, excerpt: string, contentText: string) {
  return [stripHtml(title), stripHtml(excerpt), stripHtml(contentText)].filter(Boolean).join(". ");
}

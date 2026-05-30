const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const articles = [
  {
    title: "Se ve bien… pero se siente OFF",
    slug: "se-ve-bien-pero-se-siente-off",
    excerpt: "¿No te pasa que todo debería estar funcionando… pero no lo está?",
    readTime: "3 min leer",
    category: "Vida",
    coverImage: "/covers/off-chapter-1.svg",
    featured: true,
    publishedAt: new Date("2026-05-01T12:00:00.000Z"),
    status: "published",
    content: JSON.stringify([
      {
        type: "paragraph",
        text: "Hay una versión de tu vida que se ve correcta desde afuera: proyectos avanzando, planes tomando forma, conversaciones sobre futuro. Pero por dentro algo no termina de conectar.",
      },
      { type: "h2", text: "La incomodidad no siempre es fracaso" },
      {
        type: "paragraph",
        text: "A veces lo que llamas estancamiento es una señal de que creciste más rápido que la vida que estabas construyendo. Ya no quieres solo moverte; quieres entender hacia dónde.",
      },
      {
        type: "special",
        label: "Reality Check",
        text: "Si todo se ve bien pero se siente pesado, no necesitas fingir gratitud. Necesitas escuchar con más precisión.",
      },
      { type: "quote", text: "La vida puede avanzar en métricas y aun así quedarse detenida en sentido." },
      { type: "h3", text: "Una pregunta mejor" },
      {
        type: "paragraph",
        text: "En lugar de preguntarte qué está mal contigo, empieza por preguntar qué parte de tu vida ya no representa lo que estás intentando construir.",
      },
      {
        type: "special",
        label: "Acción",
        text: "Escribe tres cosas que sigues haciendo por inercia. Al lado, anota qué necesidad emocional o profesional intentan cubrir.",
      },
    ]),
  },
  {
    title: "No estás cansado… estás desconectado",
    slug: "no-estas-cansado-estas-desconectado",
    excerpt:
      "Cómo identificar cuando el problema ya no es tu proyecto, sino la forma en la que estás viviendo mientras lo construyes.",
    readTime: "16 min leer",
    category: "Mentalidad",
    coverImage: "/covers/off-chapter-2.svg",
    featured: false,
    publishedAt: new Date("2026-05-08T12:00:00.000Z"),
    status: "published",
    content: JSON.stringify([
      {
        type: "paragraph",
        text: "El cansancio físico se recupera con descanso. La desconexión necesita otra cosa: una manera más honesta de mirar cómo estás habitando tu ambición.",
      },
      { type: "h2", text: "Cuando producir ya no te devuelve identidad" },
      {
        type: "paragraph",
        text: "Durante mucho tiempo avanzar se siente suficiente. Pero llega un punto en el que lograr pendientes ya no responde la pregunta central: ¿por qué estoy haciendo todo esto?",
      },
      {
        type: "special",
        label: "Reflexión",
        text: "La desconexión aparece cuando tu agenda crece, pero tu sentido se queda sin actualización.",
      },
      { type: "h2", text: "Estrategia para volver" },
      {
        type: "paragraph",
        text: "No se trata de abandonar tus metas. Se trata de volver a relacionarte con ellas desde presencia, no desde comparación o miedo.",
      },
      {
        type: "special",
        label: "Estrategia",
        text: "Revisa tu semana y separa actividades que expanden tu vida de actividades que solo protegen una imagen de éxito.",
      },
    ]),
  },
  {
    title: "La razón por la que sigues avanzando… pero aún no llegas al éxito",
    slug: "la-razon-por-la-que-sigues-avanzando",
    excerpt:
      "Muchos jóvenes no están cansados porque trabajen demasiado. Están cansados porque viven comparándose, pensando en el futuro y sintiendo culpa por no estar donde creían que ya deberían estar.",
    readTime: "10 min leer",
    category: "Carrera",
    coverImage: "/covers/off-chapter-3.svg",
    featured: false,
    publishedAt: new Date("2026-05-15T12:00:00.000Z"),
    status: "published",
    content: JSON.stringify([
      {
        type: "paragraph",
        text: "Hay una fatiga que no viene del trabajo, sino de medir cada parte de tu vida contra una línea imaginaria de éxito.",
      },
      { type: "h2", text: "La meta se mueve contigo" },
      {
        type: "paragraph",
        text: "Cada vez que avanzas, tu referencia cambia. Lo que antes parecía suficiente se vuelve mínimo, y la satisfacción queda siempre para después.",
      },
      { type: "quote", text: "No estás atrás. Estás intentando vivir una vida real con expectativas editadas por todos." },
      {
        type: "special",
        label: "Reality Check",
        text: "Compararte no te da dirección. Solo convierte tu proceso en evidencia falsa de insuficiencia.",
      },
      { type: "h3", text: "Construir sin desaparecer" },
      {
        type: "paragraph",
        text: "El punto no es bajar tu ambición. Es dejar de usarla como castigo. Puedes querer más sin tratar tu presente como un error.",
      },
    ]),
  },
];

async function main() {
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    await prisma.user.upsert({
      where: { email: process.env.ADMIN_EMAIL.toLowerCase() },
      update: {
        name: "Nathalie Garcia",
        passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
        role: "ADMIN",
      },
      create: {
        name: "Nathalie Garcia",
        email: process.env.ADMIN_EMAIL.toLowerCase(),
        passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
        role: "ADMIN",
      },
    });
  }

  const articleCount = await prisma.article.count();
  if (articleCount === 0) {
    for (const article of articles) {
      await prisma.article.create({
        data: { ...article, author: "Nathalie Garcia" },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

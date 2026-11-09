import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articulos = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/articulos' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string(),
    fecha: z.coerce.date(),
    publicado: z.boolean().default(true),
    categoria: z.string().regex(/^(recursos|guias|vida-a-bordo|actualidad)\/[a-z-]+$/),
    tipo: z.string(),
    imagen: z.string(),
    imagenAlt: z.string().default(''),
    imagenAncho: z.preprocess((v) => (v === '' ? undefined : v), z.number().optional()),
    imagenAlto: z.preprocess((v) => (v === '' ? undefined : v), z.number().optional()),
    minutos: z.preprocess((v) => (v === '' ? null : v), z.number().nullable().optional()),
    etiquetas: z.array(z.string()).default([]),
    imprimible: z.boolean().default(false),
    descargaUrl: z.string().optional().nullable(),
    descargaTexto: z.string().optional().nullable(),
    seo: z.object({
      titulo: z.string().optional().nullable(),
      descripcion: z.string().optional().nullable(),
      imagen: z.string().optional().nullable(),
      palabraClave: z.string().optional().nullable(),
      noindex: z.boolean().default(false),
    }).default({ noindex: false }),
  }),
});

export const collections = { articulos };

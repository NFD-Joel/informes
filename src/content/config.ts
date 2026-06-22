import { defineCollection, z } from 'astro:content';

// Informe text files. Frontmatter is optional — older files may have none,
// in which case the display title falls back to the humanized filename.
const informes = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().optional(),
    date: z.coerce.date().optional(),
  }),
});

export const collections = { informes };

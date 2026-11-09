import { getCollection } from 'astro:content';
import { paginas, preparar } from '../lib/render.mjs';

export async function getStaticPaths() {
  const posts = preparar(await getCollection('articulos'));
  return Object.entries(paginas(posts)).map(([ruta, html]) => ({ params: { ruta }, props: { html } }));
}

export function GET({ props }: { props: { html: string } }) {
  return new Response(props.html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

import { SwaggerUIEmbed } from './SwaggerUIEmbed';

export const metadata = { title: 'API docs • Procurement' };
export const dynamic = 'force-static';

/**
 * Public docs page — intentionally outside the `(app)` layout so there's no
 * sidebar / notification bell / impersonation banner crowding Swagger UI,
 * and outside `(auth)` so it's reachable without a session (the OpenAPI
 * document itself is public).
 *
 * The HTML + body already come from the root layout; this page is just a
 * container the client-side embed mounts into.
 */
export default function ApiDocsPage() {
  return <SwaggerUIEmbed />;
}

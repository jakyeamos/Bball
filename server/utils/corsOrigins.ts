const allowedOrigins = new Set([
  'http://localhost:3000',
  'https://bball-client.vercel.app',
]);

const localDevOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;
const vercelPreviewPattern = /^https:\/\/bball-client-.*\.vercel\.app$/;

export function isAllowedCorsOrigin(origin: string): boolean {
  return (
    allowedOrigins.has(origin) ||
    localDevOriginPattern.test(origin) ||
    vercelPreviewPattern.test(origin)
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';

const SWAGGER_VERSION = '5.17.14';
const CSS_HREF = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css`;
const JS_SRC   = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js`;

type SwaggerUIBundle = (opts: {
  url: string;
  dom_id: string;
  deepLinking?: boolean;
  tryItOutEnabled?: boolean;
  defaultModelsExpandDepth?: number;
}) => void;

declare global {
  interface Window { SwaggerUIBundle?: SwaggerUIBundle }
}

/**
 * Dynamically loads Swagger UI's CSS + JS from the public CDN and mounts it
 * against our `/api/openapi.json`. Also force-sets the light theme while the
 * docs are open — Swagger UI is designed for a light background and reads
 * oddly on top of the dark app theme — then restores it on unmount.
 */
export function SwaggerUIEmbed() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const errorRef = useRef<string | null>(null);

  useEffect(() => {
    const prevTheme = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'light');

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_HREF;
    document.head.appendChild(link);

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${JS_SRC}"]`);
    const script = existing ?? document.createElement('script');
    const mount = () => {
      try {
        if (!window.SwaggerUIBundle) throw new Error('SwaggerUIBundle not available');
        window.SwaggerUIBundle({
          url: '/api/openapi.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          tryItOutEnabled: false,
          defaultModelsExpandDepth: 0,
        });
        setStatus('ready');
      } catch (err) {
        errorRef.current = err instanceof Error ? err.message : String(err);
        setStatus('error');
      }
    };

    if (window.SwaggerUIBundle) {
      mount();
    } else {
      script.src = JS_SRC;
      script.async = true;
      script.onload = mount;
      script.onerror = () => {
        errorRef.current = 'Failed to load Swagger UI from CDN. Check network / CSP.';
        setStatus('error');
      };
      if (!existing) document.head.appendChild(script);
    }

    return () => {
      try { document.head.removeChild(link); } catch { /* ignore */ }
      if (prevTheme) document.documentElement.setAttribute('data-theme', prevTheme);
      else document.documentElement.removeAttribute('data-theme');
    };
  }, []);

  return (
    <div style={{ background: '#fff', color: '#111', minHeight: '100vh' }}>
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', gap: 12, background: '#fafafa',
      }}>
        <strong style={{ fontSize: 15 }}>DP(Navy) Procurement — API</strong>
        <span style={{ color: '#666', fontSize: 12 }}>
          OpenAPI 3.1 · <a href="/api/openapi.json" style={{ color: '#2563eb' }}>raw JSON</a>
        </span>
        <div style={{ flex: 1 }} />
        <a href="/dashboard" style={{ color: '#2563eb', fontSize: 13 }}>← Back to app</a>
      </div>

      {status === 'loading' && (
        <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>Loading Swagger UI…</div>
      )}
      {status === 'error' && (
        <div style={{ padding: 32, textAlign: 'center', color: '#b91c1c' }}>
          Couldn't load Swagger UI from the CDN. {errorRef.current}
          <div style={{ marginTop: 12, fontSize: 13 }}>
            Raw document still available at <a href="/api/openapi.json" style={{ color: '#2563eb' }}>/api/openapi.json</a>.
          </div>
        </div>
      )}

      <div id="swagger-ui" style={{ maxWidth: 1200, margin: '0 auto' }} />
    </div>
  );
}

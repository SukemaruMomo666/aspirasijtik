import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      render: (
        element: HTMLElement | string,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark';
          [key: string]: unknown;
        }
      ) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
    turnstile?: {
      render: (element: HTMLElement | string, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
      reset?: (widgetId: string) => void;
    };
  }
}

interface Props {
  onToken: (token: string) => void;
}

const recaptchaSiteKey =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeD-CkuAAAAAJpPsJHx_otNaKO8e7enNxAsT__H';
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

export default function TurnstileCaptcha({ onToken }: Props) {
  // Prioritas 1: Google reCAPTCHA jika sitekey tersedia, fallback ke Turnstile
  const initialProvider = recaptchaSiteKey
    ? 'recaptcha'
    : turnstileSiteKey
      ? 'turnstile'
      : 'none';

  const [activeProvider, setActiveProvider] = useState<'recaptcha' | 'turnstile' | 'none'>(initialProvider);

  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onToken);
  callbackRef.current = onToken;

  // Efek untuk Google reCAPTCHA v2 (Prioritas Utama)
  useEffect(() => {
    if (activeProvider !== 'recaptcha') return;
    if (!recaptchaSiteKey || !containerRef.current) {
      if (turnstileSiteKey) {
        setActiveProvider('turnstile');
      }
      return;
    }

    let recaptchaWidgetId: number | undefined;
    let cancelled = false;
    let isWidgetRendered = false;

    // Beralih ke Turnstile (Graceful Fallback)
    const fallbackToTurnstile = () => {
      if (cancelled) return;
      cancelled = true;

      clearTimeout(timeoutId);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      callbackRef.current('');

      if (turnstileSiteKey) {
        setActiveProvider('turnstile');
      } else {
        setActiveProvider('none');
      }
    };

    // Timeout 6 detik jika Google reCAPTCHA terblokir atau gagal memuat
    const timeoutId = window.setTimeout(() => {
      if (!isWidgetRendered) {
        fallbackToTurnstile();
      }
    }, 6000);

    const doRenderRecaptcha = () => {
      if (cancelled || !containerRef.current || isWidgetRendered) return;
      if (!window.grecaptcha || typeof window.grecaptcha.render !== 'function') return;

      try {
        recaptchaWidgetId = window.grecaptcha.render(containerRef.current, {
          sitekey: recaptchaSiteKey,
          callback: (token: string) => {
            if (!cancelled) callbackRef.current(token);
          },
          'expired-callback': () => {
            if (!cancelled) callbackRef.current('');
          },
          'error-callback': () => {
            fallbackToTurnstile();
          },
          theme: 'light',
        });
        isWidgetRendered = true;
        clearTimeout(timeoutId);
      } catch {
        fallbackToTurnstile();
      }
    };

    const tryRender = () => {
      if (cancelled) return;
      if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
        if (typeof window.grecaptcha.ready === 'function') {
          window.grecaptcha.ready(doRenderRecaptcha);
        } else {
          doRenderRecaptcha();
        }
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-recaptcha]');
    if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
      tryRender();
    } else if (existingScript) {
      existingScript.addEventListener('load', tryRender);
      existingScript.addEventListener('error', fallbackToTurnstile);
    } else {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.recaptcha = 'true';
      script.addEventListener('load', tryRender);
      script.addEventListener('error', fallbackToTurnstile);
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      existingScript?.removeEventListener('load', tryRender);
      existingScript?.removeEventListener('error', fallbackToTurnstile);
      if (recaptchaWidgetId !== undefined && window.grecaptcha?.reset) {
        try {
          window.grecaptcha.reset(recaptchaWidgetId);
        } catch {}
      }
    };
  }, [activeProvider]);

  // Efek untuk Cloudflare Turnstile (Cadangan / Fallback)
  useEffect(() => {
    if (activeProvider !== 'turnstile') return;
    if (!turnstileSiteKey || !containerRef.current) return;

    let widgetId: string | undefined;
    let cancelled = false;

    const renderTurnstileWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile || widgetId) return;
      try {
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: turnstileSiteKey,
          callback: (token: string) => {
            if (!cancelled) callbackRef.current(token);
          },
          'expired-callback': () => {
            if (!cancelled) callbackRef.current('');
          },
          'error-callback': () => {
            if (!cancelled) callbackRef.current('');
          },
          theme: 'light',
        });
      } catch {}
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
    if (window.turnstile) {
      renderTurnstileWidget();
    } else if (existing) {
      existing.addEventListener('load', renderTurnstileWidget);
    } else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstile = 'true';
      script.addEventListener('load', renderTurnstileWidget);
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      existing?.removeEventListener('load', renderTurnstileWidget);
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {}
      }
    };
  }, [activeProvider]);

  if (activeProvider === 'none' || (!recaptchaSiteKey && !turnstileSiteKey)) {
    return (
      <p role="alert" style={{ color: '#96382C', fontSize: '12px' }}>
        Verifikasi keamanan belum dikonfigurasi. Formulir sementara tidak dapat dikirim.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      aria-label="Verifikasi keamanan"
      data-captcha-provider={activeProvider}
      style={{ minHeight: '78px' }}
    />
  );
}

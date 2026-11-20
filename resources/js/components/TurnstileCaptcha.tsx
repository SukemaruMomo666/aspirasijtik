import { useEffect, useRef } from 'react';

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
  }
}

interface Props {
  onToken: (token: string) => void;
}

const siteKey =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeD-CkuAAAAAJpPsJHx_otNaKO8e7enNxAsT__H';

export default function TurnstileCaptcha({ onToken }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const callbackRef = useRef(onToken);
  callbackRef.current = onToken;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;

    const executeRender = () => {
      if (cancelled || !containerRef.current || widgetIdRef.current !== null) return;
      if (!window.grecaptcha || typeof window.grecaptcha.render !== 'function') return;

      try {
        containerRef.current.innerHTML = '';
        const id = window.grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
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
        widgetIdRef.current = id;
      } catch (err) {
        console.error('Error rendering Google reCAPTCHA:', err);
      }
    };

    const tryRender = () => {
      if (cancelled || widgetIdRef.current !== null) return;
      if (window.grecaptcha) {
        if (typeof window.grecaptcha.ready === 'function') {
          window.grecaptcha.ready(executeRender);
        } else {
          executeRender();
        }
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-recaptcha]');
    if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
      tryRender();
    } else if (existingScript) {
      existingScript.addEventListener('load', tryRender);
    } else {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.recaptcha = 'true';
      script.addEventListener('load', tryRender);
      document.head.appendChild(script);
    }

    const pollInterval = window.setInterval(() => {
      if (widgetIdRef.current !== null || cancelled) {
        clearInterval(pollInterval);
        return;
      }
      if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
        clearInterval(pollInterval);
        tryRender();
      }
    }, 200);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      existingScript?.removeEventListener('load', tryRender);
      if (widgetIdRef.current !== null && window.grecaptcha?.reset) {
        try {
          window.grecaptcha.reset(widgetIdRef.current);
        } catch {}
      }
      widgetIdRef.current = null;
    };
  }, []);

  if (!siteKey) {
    return (
      <p role="alert" style={{ color: '#96382C', fontSize: '12px' }}>
        Verifikasi Google reCAPTCHA belum dikonfigurasi. Formulir sementara tidak dapat dikirim.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      aria-label="Google reCAPTCHA"
      style={{ minHeight: '78px', display: 'flex', alignItems: 'center' }}
    />
  );
}

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export interface TurnstileRef {
  reset: () => void;
}

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

const SCRIPT_ID = 'cf-turnstile-script';

const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(
  ({ siteKey, onVerify, onExpire, onError, theme = 'light', className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const onVerifyRef = useRef(onVerify);
    const onExpireRef = useRef(onExpire);
    const onErrorRef = useRef(onError);

    useEffect(() => {
      onVerifyRef.current = onVerify;
      onExpireRef.current = onExpire;
      onErrorRef.current = onError;
    }, [onVerify, onExpire, onError]);

    const renderWidget = useCallback(() => {
      if (!siteKey || !window.turnstile || !containerRef.current) return;
      // Remove previous widget if any
      if (widgetIdRef.current !== null) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onVerifyRef.current(token),
        'expired-callback': () => onExpireRef.current?.(),
        'error-callback': () => onErrorRef.current?.(),
        theme,
      });
    }, [siteKey, theme]);

    useEffect(() => {
      if (!siteKey) return;

      // Load Turnstile script if not already present
      if (!document.getElementById(SCRIPT_ID)) {
        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => renderWidget();
        script.onerror = () => onErrorRef.current?.();
        document.head.appendChild(script);
      } else if (window.turnstile) {
        renderWidget();
      } else {
        // Script tag exists but hasn't loaded yet — wait for it
        const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement;
        const handler = () => renderWidget();
        existing.addEventListener('load', handler);
        return () => existing.removeEventListener('load', handler);
      }

      return () => {
        if (widgetIdRef.current !== null && window.turnstile) {
          try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
          widgetIdRef.current = null;
        }
      };
    }, [renderWidget, siteKey]);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current !== null && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
    }));

    return <div ref={containerRef} className={className} style={{ marginTop: '0.5rem' }} />;
  }
);

Turnstile.displayName = 'Turnstile';
export default Turnstile;

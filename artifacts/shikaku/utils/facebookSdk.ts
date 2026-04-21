import { Platform } from 'react-native';

const FB_APP_ID = '797018043174407';
const FB_API_VERSION = 'v21.0';

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (config: Record<string, unknown>) => void;
      AppEvents: { logPageView: () => void };
    };
  }
}

let initialized = false;

export function loadFacebookSdk() {
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (initialized) return;
  initialized = true;

  window.fbAsyncInit = function () {
    window.FB?.init({
      appId: FB_APP_ID,
      cookie: true,
      xfbml: true,
      version: FB_API_VERSION,
    });
    window.FB?.AppEvents.logPageView();
  };

  (function (d, s, id) {
    const fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    const js = d.createElement(s) as HTMLScriptElement;
    js.id = id;
    js.src = 'https://connect.facebook.net/en_US/sdk.js';
    fjs.parentNode?.insertBefore(js, fjs);
  })(document, 'script', 'facebook-jssdk');
}

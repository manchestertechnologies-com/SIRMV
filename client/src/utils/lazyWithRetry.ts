import { lazy, ComponentType } from 'react';

// On a slow or flaky connection a code-split chunk's dynamic import() can
// simply time out or drop mid-download — React.lazy only tries once, caches
// that single rejected promise forever, and the Suspense boundary never
// renders anything again until the user does a full page reload. This
// wrapper retries the import with a short backoff before giving up, so a
// momentary dead spot in a slow network area doesn't permanently blank out
// the (3D) view the chunk contains.
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 4,
  delayMs = 1500
) {
  return lazy(() =>
    new Promise<{ default: T }>((resolve, reject) => {
      const attempt = (remaining: number) => {
        factory()
          .then(resolve)
          .catch((error) => {
            if (remaining <= 0) {
              reject(error);
              return;
            }
            setTimeout(() => attempt(remaining - 1), delayMs);
          });
      };
      attempt(retries);
    })
  );
}

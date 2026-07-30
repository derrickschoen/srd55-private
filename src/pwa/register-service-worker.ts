const UPDATE_MESSAGE = 'SKIP_WAITING';

export function registerAppServiceWorker(
  serviceWorkers: ServiceWorkerContainer,
  updatePrompt: HTMLElement | null,
  refreshButton: HTMLButtonElement | null,
  reload: () => void,
): void {
  let waitingWorker: ServiceWorker | null = null;
  let observedInstalling: ServiceWorker | null = null;
  let refreshRequested = false;

  const showUpdate = (worker: ServiceWorker): void => {
    waitingWorker = worker;
    if (updatePrompt !== null) {
      updatePrompt.hidden = false;
    }
  };

  const observeInstalling = (worker: ServiceWorker): void => {
    if (worker === observedInstalling) {
      return;
    }
    observedInstalling = worker;
    worker.addEventListener('statechange', () => {
      if (
        worker.state === 'installed' &&
        serviceWorkers.controller !== null
      ) {
        showUpdate(worker);
      }
    });
  };

  refreshButton?.addEventListener('click', () => {
    if (waitingWorker === null) {
      return;
    }
    refreshRequested = true;
    refreshButton.disabled = true;
    refreshButton.textContent = 'Refreshing…';
    waitingWorker.postMessage(UPDATE_MESSAGE);
  });

  serviceWorkers.addEventListener('controllerchange', () => {
    if (refreshRequested) {
      refreshRequested = false;
      reload();
    }
  });

  window.addEventListener('load', () => {
    void serviceWorkers
      .register('/service-worker.js')
      .then((registration) => {
        if (registration.waiting !== null) {
          showUpdate(registration.waiting);
        }
        if (registration.installing !== null) {
          observeInstalling(registration.installing);
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (installing !== null) {
            observeInstalling(installing);
          }
        });
      })
      .catch(() => undefined);
  });
}

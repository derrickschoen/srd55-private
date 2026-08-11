import { RpcError } from '../../../rpc/protocol';

const TRANSPORT_FAILURE_COPY =
  'Draft not saved. The app lost its connection to storage — reload the page and try again.';
const UNEXPECTED_FAILURE_COPY =
  'Draft not saved. Something went wrong before the draft could be stored — try again.';

export function showDraftSaveProgress(status: HTMLElement): void {
  status.setAttribute('role', 'status');
  status.textContent = 'Saving draft…';
}

export function showDraftSaveSuccess(status: HTMLElement, message: string): void {
  status.setAttribute('role', 'status');
  status.textContent = message;
}

export function showDraftSaveRefusal(status: HTMLElement): void {
  status.setAttribute('role', 'status');
  status.textContent = 'Draft not saved.';
}

export function showDraftSaveFailure(status: HTMLElement, error: unknown): void {
  console.error('Draft save failed.', error);
  status.setAttribute('role', 'alert');
  status.textContent = error instanceof RpcError && error.code === 'transport_error'
    ? TRANSPORT_FAILURE_COPY
    : UNEXPECTED_FAILURE_COPY;
}

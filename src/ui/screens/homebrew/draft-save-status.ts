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
  const detail = error instanceof Error ? error.message : String(error);
  status.setAttribute('role', 'alert');
  status.textContent = `Draft not saved. ${detail}`;
}

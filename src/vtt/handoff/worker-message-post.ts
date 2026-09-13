/** The sole Worker adapter post seam; MessagePort performs the structured-clone boundary. */
export function postWorkerMessage(port: MessagePort, message: unknown): void {
  port.postMessage(message);
}

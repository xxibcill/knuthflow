type DataHandler = (data: string) => void;
type CloseHandler = () => void;

export class TerminalSession {
  private dataHandlers: Set<DataHandler> = new Set();
  private closeHandlers: Set<CloseHandler> = new Set();
  private closed = false;

  write(data: string): void {
    if (this.closed) return;
    this.dataHandlers.forEach((handler) => handler(data));
  }

  onData(handler: DataHandler): void {
    this.dataHandlers.add(handler);
  }

  offData(handler: DataHandler): void {
    this.dataHandlers.delete(handler);
  }

  onClose(handler: CloseHandler): void {
    this.closeHandlers.add(handler);
  }

  offClose(handler: CloseHandler): void {
    this.closeHandlers.delete(handler);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.closeHandlers.forEach((handler) => handler());
    this.dataHandlers.clear();
    this.closeHandlers.clear();
  }

  isClosed(): boolean {
    return this.closed;
  }
}

import { createServer } from 'node:net';

export default class D544HangingReporter {
  onTestRunEnd() {
    createServer().listen(0);
  }
}

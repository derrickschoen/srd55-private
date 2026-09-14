export default function gateProofGlobalSetup() {
  return function gateProofGlobalTeardown() {
    if (process.env.DND_GATE_PROOF_MODE === 'exit2') process.exitCode = 2;
    if (process.env.DND_GATE_PROOF_MODE === 'late-exit1') {
      setImmediate(() => {
        throw new Error('intentional post-report gate proof failure');
      });
    }
  };
}

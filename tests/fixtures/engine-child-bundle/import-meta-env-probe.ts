// Run under vite-node exactly as `startMcpClient` runs an engine child; prints
// the `import.meta.env` that child resolves (the engine child bundle's defines
// must equal it).
process.stdout.write(JSON.stringify(import.meta.env));

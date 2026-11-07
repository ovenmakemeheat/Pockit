import { runBoundedProcess } from "./bounded-process";

// A fresh runtime per file avoids the Bun 1.3.14 Windows crash observed
// when Prisma-backed finance tests and router tests share one process.
const files = [...new Bun.Glob("{src,scripts}/**/*.test.ts").scanSync()].sort();
if (files.length === 0) {
  console.error("No API test files found; run from the API package directory.");
  process.exit(1);
}
for (const file of files) {
  console.log(`\n--- ${file} ---`);
  const exitCode = await runBoundedProcess(
    [process.execPath, "test", "--timeout", "5000", `./${file}`],
    30_000,
  );
  if (exitCode !== 0) {
    console.error(`${file} failed (exit ${exitCode}).`);
    process.exit(exitCode);
  }
}
console.log(`\nAll ${files.length} API test files passed.`);

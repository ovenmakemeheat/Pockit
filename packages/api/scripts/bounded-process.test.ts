import { expect, test } from "bun:test";
import { runBoundedProcess } from "./bounded-process";

test("preserves a successful child exit", async () => {
  expect(
    await runBoundedProcess([process.execPath, "-e", "process.exit(0)"], 5_000),
  ).toBe(0);
});

test("preserves a failing child exit", async () => {
  expect(
    await runBoundedProcess([process.execPath, "-e", "process.exit(7)"], 5_000),
  ).toBe(7);
});

test("terminates a child that never finishes", async () => {
  const start = performance.now();
  expect(
    await runBoundedProcess(
      [process.execPath, "-e", "setInterval(() => {}, 1000)"],
      300,
    ),
  ).toBe(124);
  expect(performance.now() - start).toBeLessThan(4_000);
});

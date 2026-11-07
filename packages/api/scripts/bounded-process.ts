export async function runBoundedProcess(
  command: string[],
  timeoutMs: number,
): Promise<number> {
  const child = Bun.spawn(command, {
    stdin: "ignore",
    stdout: "inherit",
    stderr: "inherit",
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      child.exited,
      new Promise<number>((resolve) => {
        timer = setTimeout(() => {
          console.error(
            `Process exceeded ${timeoutMs}ms: ${command.join(" ")}`,
          );
          // Bun's Windows crash reporter can keep a crashed process alive.
          // Terminate only this child tree, never unrelated dev processes.
          if (process.platform === "win32") {
            Bun.spawnSync(
              ["taskkill.exe", "/PID", String(child.pid), "/T", "/F"],
              {
                stdout: "ignore",
                stderr: "ignore",
                timeout: 3_000,
              },
            );
          }
          child.kill(9);
          resolve(124);
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

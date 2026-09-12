import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { buildSync } from "esbuild";

// Use the same TypeScript bundler as electron-vite, without launching Electron.
const { outputFiles } = buildSync({
  stdin: {
    contents: `
      export * from './src/main/dynamic-context.ts';
      export * from './src/main/transcription-prompt.ts';
      export * from './src/shared/types.ts';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { loadDynamicContext, buildTranscriptionPrompt, DEFAULT_CONFIG } =
  await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`);

const scriptDirectory = mkdtempSync(join(tmpdir(), "yaptap context test-"));
const scriptFiles = [];
after(() => {
  for (const path of scriptFiles) unlinkSync(path);
  rmdirSync(scriptDirectory);
});

function scriptConfig(source, args = "", extension = "cjs") {
  const scriptPath = join(scriptDirectory, `context script ${scriptFiles.length}.${extension}`);
  writeFileSync(scriptPath, source);
  scriptFiles.push(scriptPath);
  return {
    ...DEFAULT_CONFIG,
    dynamicContextEnabled: true,
    dynamicContextSource: "script",
    dynamicContextExecutable: process.execPath,
    dynamicContextScriptPath: scriptPath,
    dynamicContextScriptArgs: args,
  };
}

async function withServer(handler, run) {
  const server = createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    return await run({
      ...DEFAULT_CONFIG,
      dynamicContextEnabled: true,
      dynamicContextUrl: `http://127.0.0.1:${server.address().port}/context`,
    });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

test("disabled sources do not make HTTP requests or execute scripts", async () => {
  let requests = 0;
  await withServer((_req, res) => { requests++; res.end("unexpected"); }, async (config) => {
    assert.deepEqual(await loadDynamicContext({ ...config, dynamicContextEnabled: false }), { text: "" });
  });
  assert.equal(requests, 0);
  const config = scriptConfig("throw new Error('must not execute')");
  assert.deepEqual(await loadDynamicContext({ ...config, dynamicContextEnabled: false }), { text: "" });
});

test("fetches fresh UTF-8 context on every recording and preserves static vocabulary", async () => {
  let requests = 0;
  await withServer((req, res) => {
    assert.equal(req.method, "GET");
    res.end(`  objednávka_${++requests}, žluťoučký\n`);
  }, async (config) => {
    config.fixedPrompt = "Projekt YapTap";
    config.customWords = "TypeScript";
    const noScreen = async () => { throw new Error("disabled screenshot must not run"); };
    const first = await buildTranscriptionPrompt(config, noScreen);
    const second = await buildTranscriptionPrompt(config, noScreen);
    assert.match(first, /Projekt YapTap/);
    assert.match(first, /Specifická slova: TypeScript/);
    assert.match(first, /objednávka_1, žluťoučký/);
    assert.match(second, /objednávka_2, žluťoučký/);
    assert.doesNotMatch(second, /objednávka_1/);
  });
});

test("loads URL and screenshot context concurrently and includes both", { timeout: 3000 }, async () => {
  let notifyRequest;
  const requestReceived = new Promise((resolve) => { notifyRequest = resolve; });
  await withServer((_req, res) => { notifyRequest(); res.end("customer_id"); }, async (config) => {
    const prompt = await buildTranscriptionPrompt({ ...config, screenshotEnabled: true }, async () => {
      await requestReceived;
      return "Na screenshotu je vidět: IDE";
    });
    assert.match(prompt, /Na screenshotu je vidět: IDE/);
    assert.match(prompt, /customer_id/);
  });
});

test("script receives paths and arguments with spaces literally, runs in its directory, and only returns stdout", async () => {
  const args = ["cesta s mezerami", "$(literal)", "a;b", '"literal quotes"'];
  const config = scriptConfig(`
    console.error('diagnostic output');
    console.log(JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd(), encoding: process.env.PYTHONIOENCODING, text: 'příliš žluťoučký' }));
  `, args.join("\r\n") + "\r\n");
  const result = await loadDynamicContext(config);
  assert.equal(result.error, undefined);
  assert.deepEqual(JSON.parse(result.text), {
    args, cwd: scriptDirectory, encoding: "utf-8", text: "příliš žluťoučký",
  });
});

test("rejects invalid URLs, relative script paths, and missing executables", async () => {
  for (const url of ["", "not a url", "file:///private", "ftp://localhost/context"]) {
    const result = await loadDynamicContext({ ...DEFAULT_CONFIG, dynamicContextEnabled: true, dynamicContextUrl: url });
    assert.ok(result.error);
    assert.equal(result.text, "");
  }
  const config = scriptConfig("console.log('hello')");
  assert.match((await loadDynamicContext({ ...config, dynamicContextScriptPath: "relative.py" })).error, /absolutní cestu/);
  assert.ok((await loadDynamicContext({ ...config, dynamicContextExecutable: "yaptap-missing-interpreter" })).error);
});

test("Python returns Czech vocabulary from a script path with spaces", async (t) => {
  const executable = process.env.YAPTAP_TEST_PYTHON || "python";
  const probe = spawnSync(executable, ["--version"], { windowsHide: true, timeout: 5000 });
  if (probe.error || probe.status !== 0) return t.skip("Python is not installed");
  const config = scriptConfig(
    "import sys\nprint('objednávka, příliš žluťoučký, ' + sys.argv[1])\n",
    "český argument s mezerami",
    "py",
  );
  const result = await loadDynamicContext({ ...config, dynamicContextExecutable: executable });
  assert.equal(result.error, undefined);
  assert.equal(result.text, "objednávka, příliš žluťoučký, český argument s mezerami");
});

test("HTTP errors, empty output, and nonzero script exits return no context", async () => {
  await withServer((_req, res) => { res.writeHead(503); res.end("unavailable"); }, async (config) => {
    const result = await loadDynamicContext(config);
    assert.equal(result.text, "");
    assert.match(result.error, /HTTP 503/);
    const prompt = await buildTranscriptionPrompt({ ...config, fixedPrompt: "YapTap", customWords: "API" }, async () => "");
    assert.match(prompt, /YapTap/);
    assert.match(prompt, /Specifická slova: API/);
    assert.doesNotMatch(prompt, /Doplňující kontext/);
  });
  const empty = await loadDynamicContext(scriptConfig("console.log('  ');"));
  assert.equal(empty.text, "");
  assert.match(empty.error, /žádný kontext/);
  const failed = await loadDynamicContext(scriptConfig("console.log('partial'); console.error('bad data'); process.exit(2);"));
  assert.equal(failed.text, "");
  assert.match(failed.error, /bad data/);
});

test("bounds URL and script output and reports prompt truncation", async () => {
  await withServer((_req, res) => res.end("x".repeat(70_000)), async (config) => {
    const result = await loadDynamicContext(config);
    assert.equal(result.text, "");
    assert.match(result.error, /64 KiB/);
  });
  const large = await loadDynamicContext(scriptConfig("process.stdout.write('x'.repeat(70000));"));
  assert.equal(large.text, "");
  assert.match(large.error, /64 KiB/);
  const trimmed = await loadDynamicContext(scriptConfig("console.log('x'.repeat(9000));"));
  assert.equal(trimmed.text.length, 8000);
  assert.equal(trimmed.truncated, true);
});

test("times out a stalled HTTP body and a hanging script", { timeout: 16_000 }, async () => {
  const hangingScript = loadDynamicContext(scriptConfig("setInterval(() => {}, 1000);"));
  const hangingResponse = withServer((_req, res) => {
    res.writeHead(200);
    res.write("unfinished response");
  }, (config) => loadDynamicContext(config));
  for (const result of await Promise.all([hangingScript, hangingResponse])) {
    assert.equal(result.text, "");
    assert.match(result.error, /časový limit 10 sekund/);
  }
});

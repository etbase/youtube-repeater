import { JSDOM } from 'jsdom';
import { BotGuardClient, getChallenge } from 'bgutils-js/botguard';
import { WebPoMinter } from 'bgutils-js/webpo';
import { buildURL, getHeaders } from 'bgutils-js/utils';

const REQUEST_KEY = 'O43z0dpjhgX20SCx4KAo';

let state = null;
let inFlight = null;
let domReady = false;

async function ensureDom() {
  if (domReady) return;
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
    url: 'https://www.youtube.com/',
    referrer: 'https://www.youtube.com/',
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.location = dom.window.location;
  globalThis.origin = dom.window.origin;
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: dom.window.navigator,
      configurable: true,
    });
  } catch {
    if (!globalThis.navigator) globalThis.navigator = dom.window.navigator;
  }
  domReady = true;
}

async function createMinter() {
  await ensureDom();
  const challenge = await getChallenge({ requestKey: REQUEST_KEY, fetchFunction: fetch });
  const interpreter = challenge.interpreterJavascript?.privateDoNotAccessOrElseSafeScriptWrappedValue;
  if (!interpreter) throw new Error('BotGuard challenge contained no interpreter script');
  new Function(interpreter)();
  const client = await BotGuardClient.create({
    program: challenge.program,
    globalName: challenge.globalName,
    globalObject: globalThis,
  });
  const webPoSignalOutput = [];
  const botguardResponse = await client.snapshot({ webPoSignalOutput });
  const response = await fetch(buildURL('GenerateIT', false), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify([REQUEST_KEY, botguardResponse]),
  });
  if (!response.ok) throw new Error(`GenerateIT responded ${response.status}`);
  const [integrityToken, ttlSeconds = 3600] = await response.json();
  if (!integrityToken) throw new Error('GenerateIT returned no integrity token');
  const minter = await WebPoMinter.create(
    { integrityToken, estimatedTtlSecs: ttlSeconds },
    webPoSignalOutput,
  );
  return {
    minter,
    client,
    expiresAt: Date.now() + ttlSeconds * 1000 * 0.8,
  };
}

export async function mintPoToken(videoId, { force = false } = {}) {
  if (force) state = null;
  if (!state || state.expiresAt <= Date.now()) {
    const previous = state;
    inFlight ??= createMinter()
      .then((next) => {
        if (previous) void previous.client.shutdown().catch(() => {});
        state = next;
        return next;
      })
      .finally(() => {
        inFlight = null;
      });
    await inFlight;
  }
  return state.minter.mintAsWebsafeString(videoId);
}

import "server-only";

export class CometChatApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "CometChatApiError";
    this.status = status;
    this.code = code;
  }
}

function redactCredential(message, credential) {
  if (!credential) return message;

  const escapedCredential = credential.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return message.replace(new RegExp(escapedCredential, "gi"), "[REDACTED]");
}

function safeProviderMessage(message, config) {
  let safeMessage = String(message || "CometChat rejected the request.");

  for (const credential of [config?.apiKey, config?.appId]) {
    safeMessage = redactCredential(safeMessage, credential);
  }

  return safeMessage
    .replace(/(apikey\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/(auth[_\s-]*token\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/(auth(?:entication)?[\s_-]*key\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .slice(0, 500);
}

function getCometChatConfig() {
  const appId = process.env.NEXT_PUBLIC_COMETCHAT_APP_ID;
  const region = process.env.NEXT_PUBLIC_COMETCHAT_REGION;
  const apiKey = process.env.COMETCHAT_API_KEY;
  const envPresence = {
    COMETCHAT_API_KEY: Boolean(apiKey?.trim()),
    NEXT_PUBLIC_COMETCHAT_APP_ID: Boolean(appId?.trim()),
    NEXT_PUBLIC_COMETCHAT_REGION: Boolean(region?.trim()),
  };

  console.info(
    "[CometChat diagnostics] Environment variable presence " +
      `COMETCHAT_API_KEY=${envPresence.COMETCHAT_API_KEY} ` +
      `NEXT_PUBLIC_COMETCHAT_APP_ID=${envPresence.NEXT_PUBLIC_COMETCHAT_APP_ID} ` +
      `NEXT_PUBLIC_COMETCHAT_REGION=${envPresence.NEXT_PUBLIC_COMETCHAT_REGION}`
  );

  if (!envPresence.NEXT_PUBLIC_COMETCHAT_APP_ID ||
      !envPresence.NEXT_PUBLIC_COMETCHAT_REGION ||
      !envPresence.COMETCHAT_API_KEY) {
    throw new Error("CometChat server configuration is incomplete.");
  }

  const normalizedRegion = region.trim().toLowerCase();
  if (!["us", "eu", "in"].includes(normalizedRegion)) {
    throw new Error("CometChat region is not supported.");
  }

  return { appId: appId.trim(), region: normalizedRegion, apiKey: apiKey.trim() };
}

async function requestCometChat(path, { appId, region, apiKey }, init) {
  const response = await fetch(
    `https://${appId}.api-${region}.cometchat.io/v3${path}`,
    {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
        ...init.headers,
      },
    }
  );

  const responseText = await response.text();
  let payload = null;
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      console.error(
        "[CometChat diagnostics] HTTP response status=" +
          `${response.status} code=INVALID_RESPONSE ` +
          "message=CometChat returned an unreadable response."
      );
      throw new CometChatApiError(
        response.status,
        "INVALID_RESPONSE",
        "CometChat returned an unreadable response."
      );
    }
  }

  if (!response.ok) {
    const providerError = payload?.error;
    const code = providerError?.code || payload?.code || "COMETCHAT_REQUEST_FAILED";
    const message = safeProviderMessage(
      providerError?.message || payload?.message || "CometChat rejected the request.",
      { appId, apiKey }
    );
    console.error(
      "[CometChat diagnostics] Request failed " +
        `status=${response.status} code=${code} message=${message}`
    );
    throw new CometChatApiError(
      response.status,
      code,
      message
    );
  }

  console.info(`[CometChat diagnostics] HTTP response status=${response.status}`);
  return payload?.data;
}

export function logCometChatConfigurationError(error) {
  console.error(
    "[CometChat diagnostics] Request could not be sent message=" +
      safeProviderMessage(error?.message || "CometChat configuration failed.", {
        appId: process.env.NEXT_PUBLIC_COMETCHAT_APP_ID,
        apiKey: process.env.COMETCHAT_API_KEY,
      })
  );
}

function isDuplicateUserError(error) {
  return (
    error instanceof CometChatApiError &&
    (error.status === 409 ||
      error.code === "ERR_UID_ALREADY_EXISTS" ||
      /already exists/i.test(error.message))
  );
}

export async function createDemoSessionToken(profile, demoUsers) {
  const config = getCometChatConfig();
  let authToken = null;

  for (const demoUser of demoUsers) {
    try {
      const result = await requestCometChat(
        "/users",
        config,
        {
          method: "POST",
          body: JSON.stringify({
            uid: demoUser.uid,
            name: demoUser.name,
            withAuthToken: demoUser.uid === profile.uid,
          }),
        }
      );

      if (demoUser.uid === profile.uid) authToken = result?.authToken || null;
    } catch (error) {
      if (!isDuplicateUserError(error)) throw error;
    }
  }

  if (!authToken) {
    const result = await requestCometChat(
      `/users/${encodeURIComponent(profile.uid)}/auth_tokens`,
      config,
      { method: "POST", body: JSON.stringify({}) }
    );
    authToken = result?.authToken || null;
  }

  if (!authToken) {
    throw new CometChatApiError(
      502,
      "AUTH_TOKEN_MISSING",
      "CometChat did not return an auth token for the selected demo profile."
    );
  }

  return authToken;
}

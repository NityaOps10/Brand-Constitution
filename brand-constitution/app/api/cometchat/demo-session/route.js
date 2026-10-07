import { NextResponse } from "next/server";
import { DEMO_USERS } from "@/lib/cometchat/demo-users";
import {
  CometChatApiError,
  createDemoSessionToken,
  logCometChatConfigurationError,
} from "@/lib/cometchat/server";

export const runtime = "nodejs";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const profile = DEMO_USERS.find((user) => user.id === body?.profileId);
  if (!profile) {
    return NextResponse.json({ error: "Select a valid demo profile." }, { status: 400 });
  }

  try {
    const authToken = await createDemoSessionToken(profile, DEMO_USERS);
    return NextResponse.json(
      { authToken, uid: profile.uid },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof CometChatApiError) {
      return NextResponse.json(
        {
          error: "Could not create a CometChat demo session.",
          code: error.code,
        },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (error instanceof Error) {
      logCometChatConfigurationError(error);
      return NextResponse.json(
        { error: "CometChat server configuration or connection failed." },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    throw error;
  }
}

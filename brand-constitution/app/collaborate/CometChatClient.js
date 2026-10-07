"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CometChatCalls } from "@cometchat/calls-sdk-javascript";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import {
  CometChatCallButtons,
  CometChatErrorBoundary,
  CometChatIncomingCall,
  CometChatMessageComposer,
  CometChatMessageList,
  CometChatProvider,
  CometChatSearch,
  CometChatUIKit,
  useCometChatEvents,
} from "@cometchat/chat-uikit-react";
import { DEMO_USERS } from "@/lib/cometchat/demo-users";

let initPromise;
let sessionQueue = Promise.resolve();

function initializeCometChat() {
  if (!initPromise) {
    const appId = process.env.NEXT_PUBLIC_COMETCHAT_APP_ID;
    const region = process.env.NEXT_PUBLIC_COMETCHAT_REGION;

    if (!appId || !region) {
      throw new Error("CometChat App ID or region is missing from the environment.");
    }

    initPromise = CometChatUIKit.initFromSettings({
      appId,
      region,
      chatSDK: {
        presenceSubscription: { type: "ALL_USERS" },
      },
      uiKit: { callsSDK: {} },
    }).catch((error) => {
      initPromise = undefined;
      throw error;
    });
  }

  return initPromise;
}

function withSessionQueue(operation) {
  const next = sessionQueue.then(operation, operation);
  sessionQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

async function loginAsDemoProfile(profile) {
  await initializeCometChat();

  return withSessionQueue(async () => {
    const currentUser = CometChatUIKit.getLoggedInUser();
    if (currentUser?.getUid() === profile.uid) return currentUser;
    if (currentUser) await CometChatUIKit.logout();

    const response = await fetch("/api/cometchat/demo-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ profileId: profile.id }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not start the demo chat session.");
    }

    if (typeof data.authToken !== "string" || !data.authToken) {
      throw new Error("The server did not return a valid CometChat auth token.");
    }

    await CometChatUIKit.loginWithAuthToken(data.authToken);
    return CometChatUIKit.getLoggedInUser();
  });
}

function errorMessage(error) {
  return error instanceof Error ? error.message : "An unexpected chat error occurred.";
}

function CallStatusEvents({ onStatusChange }) {
  useCometChatEvents((event) => {
    if (event.type === "ui:call/outgoing") {
      onStatusChange("ringing");
    } else if (event.type === "ui:call/accepted") {
      onStatusChange("connecting");
    } else if (event.type === "ui:call/rejected") {
      onStatusChange("rejected");
    } else if (event.type === "ui:call/ended") {
      onStatusChange("ended");
    }
  }, [onStatusChange]);

  useEffect(() => {
    const listenerId = "brand-constitution-demo-calls";
    CometChat.addCallListener(
      listenerId,
      new CometChat.CallListener({
        onIncomingCallReceived: () => {
          onStatusChange("ringing");
        },
        onOutgoingCallAccepted: () => {
          onStatusChange("connecting");
        },
        onOutgoingCallRejected: () => {
          onStatusChange("rejected");
        },
        onIncomingCallCancelled: () => {
          onStatusChange("ended");
        },
        onCallEndedMessageReceived: () => {
          onStatusChange("ended");
        },
      })
    );

    const removeJoinedListener = CometChatCalls.addEventListener("onSessionJoined", () => {
      onStatusChange("connected");
    });
    const removeLeftListener = CometChatCalls.addEventListener("onSessionLeft", () => {
      onStatusChange("ended");
    });
    const removeConnectionLostListener = CometChatCalls.addEventListener("onConnectionLost", () => {
      onStatusChange("connecting");
    });
    const removeConnectionRestoredListener = CometChatCalls.addEventListener("onConnectionRestored", () => {
      onStatusChange("connected");
    });

    return () => {
      CometChat.removeCallListener(listenerId);
      removeJoinedListener?.();
      removeLeftListener?.();
      removeConnectionLostListener?.();
      removeConnectionRestoredListener?.();
    };
  }, [onStatusChange]);

  return null;
}

const CALL_STATUS_LABELS = {
  ringing: "Ringing…",
  connecting: "Connecting…",
  connected: "Connected",
  ended: "Call ended",
  rejected: "Call declined",
  failed: "Call failed",
};

export default function CometChatClient({ section }) {
  const [profileChoice, setProfileChoice] = useState(DEMO_USERS[0].id);
  const [activeProfile, setActiveProfile] = useState(null);
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [presence, setPresence] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [callStatus, setCallStatus] = useState("");
  const [endingCall, setEndingCall] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const updateCallStatus = useCallback((status) => setCallStatus(status), []);
  const callInProgress = ["ringing", "connecting", "connected"].includes(callStatus);

  useEffect(() => {
    if (!activeProfile) return undefined;

    const listenerId = "brand-constitution-demo-presence";
    CometChat.addUserListener(
      listenerId,
      new CometChat.UserListener({
        onUserOnline: (user) => {
          setPresence((current) => ({ ...current, [user.getUid()]: "online" }));
        },
        onUserOffline: (user) => {
          setPresence((current) => ({ ...current, [user.getUid()]: "offline" }));
        },
      })
    );

    return () => CometChat.removeUserListener(listenerId);
  }, [activeProfile]);

  async function choosePeer(profile) {
    if (callInProgress) return;

    setSelectedPeer(profile);
    setSelectedUser(null);
    setError("");

    try {
      const user = await CometChat.getUser(profile.uid);
      setPresence((current) => ({
        ...current,
        [profile.uid]: user.getStatus() || "offline",
      }));
      setSelectedUser(user);
    } catch (selectionError) {
      setError(errorMessage(selectionError));
    }
  }

  async function startSession() {
    if (callInProgress) {
      setError("End the current call before switching demo profiles.");
      return;
    }

    const profile = DEMO_USERS.find((user) => user.id === profileChoice);
    if (!profile) {
      setError("Choose one of the available demo profiles.");
      return;
    }

    async function endCall() {
      setEndingCall(true);
      setError("");

      try {
        await CometChatCalls.leaveSession();
        setCallStatus("ended");
      } catch (callError) {
        setError(errorMessage(callError));
        setCallStatus("failed");
      } finally {
        setEndingCall(false);
      }
    }

    setBusy(true);
    setError("");
    setActiveProfile(null);
    setSelectedPeer(null);
    setSelectedUser(null);

    try {
      await loginAsDemoProfile(profile);
      setCallStatus("");
      setActiveProfile(profile);

      const peers = DEMO_USERS.filter((user) => user.id !== profile.id);
      const loadedPeers = await Promise.all(
        peers.map(async (peer) => {
          const user = await CometChat.getUser(peer.uid);
          return { peer, user };
        })
      );

      setPresence((current) => ({
        ...current,
        ...Object.fromEntries(
          loadedPeers.map(({ peer, user }) => [peer.uid, user.getStatus() || "offline"])
        ),
      }));

      if (loadedPeers[0]) {
        setSelectedPeer(loadedPeers[0].peer);
        setSelectedUser(loadedPeers[0].user);
      }
    } catch (sessionError) {
      setError(errorMessage(sessionError));
    } finally {
      setBusy(false);
    }
  }

  const peers = activeProfile
    ? DEMO_USERS.filter((profile) => profile.id !== activeProfile.id)
    : [];

  return (
    <main className="collaborate-shell">
      <header className="collaborate-topbar">
        <Link className="collaborate-brand" href="/">
          <span className="collaborate-mark" aria-hidden="true">BC</span>
          <span>Brand Constitution</span>
        </Link>
        <span className="collaborate-label">Demo collaboration</span>
      </header>

      {section && (
        <div className="collaborate-context-banner" role="status">
          Discussing: <strong>{section}</strong>
        </div>
      )}

      <section className="collaborate-workspace">
        <aside className="collaborate-sidebar">
          <div className="collaborate-profile">
            <label htmlFor="demo-profile">Chat as</label>
            <div className="collaborate-profile-row">
              <select
                id="demo-profile"
                value={profileChoice}
                onChange={(event) => setProfileChoice(event.target.value)}
                disabled={busy || callInProgress}
              >
                {DEMO_USERS.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={startSession} disabled={busy || callInProgress}>
                {busy ? "Connecting…" : activeProfile ? "Switch" : "Start"}
              </button>
            </div>
            {activeProfile && (
              <p className="collaborate-current-profile">
                Signed in as <strong>{activeProfile.name}</strong>
              </p>
            )}
          </div>

          <div className="collaborate-peer-list" aria-label="Demo collaborators">
            <h1>People</h1>
            {peers.length === 0 ? (
              <p className="collaborate-muted">Start a demo session to see collaborators.</p>
            ) : (
              peers.map((profile) => (
                <button
                  className={`collaborate-peer${selectedPeer?.id === profile.id ? " is-selected" : ""}`}
                  key={profile.id}
                  type="button"
                  onClick={() => choosePeer(profile)}
                  disabled={callInProgress}
                  aria-pressed={selectedPeer?.id === profile.id}
                >
                  <span className={`collaborate-presence ${presence[profile.uid] === "online" ? "is-online" : ""}`} />
                  <span>{profile.name}</span>
                  <span className="collaborate-peer-status">
                    {presence[profile.uid] || "offline"}
                  </span>
                </button>
              ))
            )}
          </div>

          <p className="collaborate-demo-note">
            Demo profiles are shared and can be selected by anyone. Do not use private information.
          </p>
        </aside>

        <section className="collaborate-chat-panel" aria-label="One-to-one chat">
          {error && <p className="collaborate-error" role="alert">{error}</p>}
          {activeProfile ? (
            <CometChatErrorBoundary>
              <CometChatProvider theme="light">
                <CallStatusEvents
                  onStatusChange={updateCallStatus}
                />
                <CometChatIncomingCall
                  onAccept={() => setCallStatus("connecting")}
                  onDecline={() => {
                    setCallStatus("rejected");
                  }}
                  onError={(callError) => {
                    setError(errorMessage(callError));
                    setCallStatus("failed");
                  }}
                />
                <div className="collaborate-chat">
                  {selectedUser ? (
                    <>
                      <header className="collaborate-chat-header">
                        <div className="collaborate-chat-recipient">
                          <span
                            className={`collaborate-presence ${presence[selectedPeer?.uid] === "online" ? "is-online" : ""}`}
                            aria-label={presence[selectedPeer?.uid] === "online" ? "Online" : "Offline"}
                          />
                          <div>
                            <h2>{selectedUser.getName()}</h2>
                            <p>{presence[selectedPeer?.uid] || "offline"}</p>
                          </div>
                        </div>
                        <div className="collaborate-header-actions">
                          <button
                            className="collaborate-search-button"
                            type="button"
                            onClick={() => setSearchOpen((current) => !current)}
                            aria-pressed={searchOpen}
                          >
                            {searchOpen ? "Close search" : "Search messages"}
                          </button>
                          <CometChatCallButtons
                            user={selectedUser}
                            voiceCallButtonView={
                              <button className="collaborate-call-action collaborate-voice-action" type="button">
                                Start Voice Call
                              </button>
                            }
                            videoCallButtonView={
                              <button className="collaborate-call-action collaborate-video-action" type="button">
                                Start Video Call
                              </button>
                            }
                            onCallEnded={() => {
                              setCallStatus("ended");
                            }}
                            onError={(callError) => {
                              setError(errorMessage(callError));
                              setCallStatus("failed");
                            }}
                          />
                        </div>
                      </header>
                      {callStatus && (
                        <div
                          className={`collaborate-call-status is-${callStatus}`}
                          role="status"
                          aria-live="polite"
                        >
                          <span>{CALL_STATUS_LABELS[callStatus] || "Call status updated"}</span>
                          {callStatus === "connected" && (
                            <button
                              className="collaborate-end-call"
                              type="button"
                              onClick={endCall}
                              disabled={endingCall}
                            >
                              {endingCall ? "Ending…" : "End Call"}
                            </button>
                          )}
                        </div>
                      )}
                      {searchOpen ? (
                        <div className="collaborate-search-panel">
                          <CometChatSearch
                            uid={selectedUser.getUid()}
                            searchIn={["messages"]}
                            onMessageClicked={() => setSearchOpen(false)}
                            onBack={() => setSearchOpen(false)}
                            onConversationClicked={() => setSearchOpen(false)}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="collaborate-message-list">
                            <CometChatMessageList user={selectedUser} />
                          </div>
                          <div className="collaborate-message-composer">
                            <CometChatMessageComposer
                              user={selectedUser}
                              hideAttachmentButton
                              hideVoiceRecordingButton
                              disableDragAndDrop
                            />
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="collaborate-empty">
                      <h2>Choose a collaborator</h2>
                      <p>Select a person to start chatting or calling.</p>
                    </div>
                  )}
                </div>
              </CometChatProvider>
            </CometChatErrorBoundary>
          ) : (
            <div className="collaborate-empty">
              <h2>{busy ? "Connecting to CometChat…" : "Choose a collaborator"}</h2>
              <p>Start a demo session and select a person to open a one-to-one conversation.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

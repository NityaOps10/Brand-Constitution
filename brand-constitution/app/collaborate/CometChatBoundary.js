"use client";

import dynamic from "next/dynamic";

const CometChatClient = dynamic(() => import("./CometChatClient"), {
  ssr: false,
  loading: () => (
    <main className="collaborate-shell">
      <div className="collaborate-loading" role="status">
        Loading collaboration…
      </div>
    </main>
  ),
});

export default function CometChatBoundary({ section }) {
  return <CometChatClient section={section} />;
}

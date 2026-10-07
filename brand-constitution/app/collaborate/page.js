import CometChatBoundary from "./CometChatBoundary";

export const metadata = {
  title: "Collaborate | Brand Constitution",
  description: "Chat with demo collaborators in real time.",
};

const DISCUSSION_SECTIONS = ["Brand Voice", "Target Audience", "Positioning"];

export default async function CollaboratePage({ searchParams }) {
  const params = await searchParams;
  const requestedSection = params?.section;
  const section =
    typeof requestedSection === "string" &&
    DISCUSSION_SECTIONS.includes(requestedSection)
      ? requestedSection
      : null;

  return <CometChatBoundary section={section} />;
}

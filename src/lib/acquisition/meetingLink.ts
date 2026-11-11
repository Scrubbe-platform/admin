/** Finds a call link in free text and names the service it belongs to. */

const LINK_PATTERN =
  /(https?:\/\/[^\s]+|(?:[\w-]+\.)*(?:zoom\.us|zoom\.com|zoomgov\.com|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|webex\.com|gotomeet\.me|whereby\.com|meet\.jit\.si)\/[^\s]*)/i;

export interface MeetingProvider {
  name: string;
  /** The service's own brand colour, shown as a small dot beside its name. */
  color: string;
}

const GENERIC: MeetingProvider = { name: "Meeting link", color: "#687B9E" };

const PROVIDERS: { host: RegExp; provider: MeetingProvider }[] = [
  { host: /(^|\.)(zoom\.us|zoom\.com|zoomgov\.com)$/, provider: { name: "Zoom", color: "#2D8CFF" } },
  { host: /(^|\.)meet\.google\.com$/, provider: { name: "Google Meet", color: "#00897B" } },
  { host: /(^|\.)(teams\.microsoft\.com|teams\.live\.com)$/, provider: { name: "Microsoft Teams", color: "#5B5FC7" } },
  { host: /(^|\.)webex\.com$/, provider: { name: "Webex", color: "#2A9D4B" } },
  { host: /(^|\.)(gotomeet\.me|gotomeeting\.com|goto\.com)$/, provider: { name: "GoToMeeting", color: GENERIC.color } },
  { host: /(^|\.)whereby\.com$/, provider: { name: "Whereby", color: GENERIC.color } },
  { host: /(^|\.)meet\.jit\.si$/, provider: { name: "Jitsi", color: GENERIC.color } },
];

/** The first link in the text, with https:// added when it was pasted without a scheme. */
export function linkOf(text: string | undefined): string {
  const found = LINK_PATTERN.exec(text ?? "")?.[0];
  if (!found) return "";
  return /^https?:\/\//i.test(found) ? found : `https://${found}`;
}

export function providerOf(text: string | undefined): MeetingProvider | null {
  const url = linkOf(text);
  if (!url) return null;

  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  return PROVIDERS.find((entry) => entry.host.test(host))?.provider ?? GENERIC;
}

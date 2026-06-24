export type EventType = "mixer" | "panel" | "conference" | "webinar" | "other";

export type TrustLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ThemeRelation = "reinforces" | "extends" | "contradicts" | "new";

export type PersonRole = "speaker" | "attendee" | "organizer" | "unknown";

export type ContentPlatform =
  | "linkedin"
  | "twitter"
  | "newsletter"
  | "blog"
  | "substack"
  | "medium";

export type SessionStage =
  | "ingested"
  | "extracted"
  | "synthesized"
  | "drafted"
  | "reviewed"
  | "published";

export interface SourceRef {
  type: "note" | "screenshot" | "audio" | "conversation";
  ref: string;
  excerpt?: string;
}

export interface Claim {
  id: string;
  text: string;
  sources: SourceRef[];
  confidence: "high" | "medium" | "low";
  themeId?: string;
}

export interface Person {
  id: string;
  name: string;
  role: PersonRole;
  company?: string;
  title?: string;
  linkedInUrl?: string;
  metInPerson: boolean;
  conversationNotes?: string;
  followUpDraftId?: string;
}

export interface Interaction {
  id: string;
  personId: string;
  summary: string;
  memorableDetail?: string;
  topics: string[];
  sources: SourceRef[];
}

export interface Theme {
  id: string;
  label: string;
  claimIds: string[];
  relation?: ThemeRelation;
  profileConnection?: string;
}

export interface ContentAngle {
  id: string;
  title: string;
  hook: string;
  nonObviousInsight: string;
  rationale: string;
  expertiseLens: string[];
  platforms: ContentPlatform[];
  predictedAudience: string;
  claimIds: string[];
}

export interface FollowUpDraft {
  id: string;
  personId: string;
  message: string;
  contextUsed: string[];
  tone: "warm" | "professional" | "curious";
}

export interface ContentDraft {
  id: string;
  angleId: string;
  platform: ContentPlatform;
  body: string;
  reasoningTrace: string[];
}

export interface EvalScores {
  grounding: number;
  voice: number;
  expertiseLens: number;
  nonObviousness: number;
  notes?: string;
  humanOverride?: Partial<Record<keyof Omit<EvalScores, "notes" | "humanOverride">, number>>;
}

export interface AssumptionChallenge {
  question: string;
  relatedClaimIds: string[];
  intent: string;
}

export type CaptureKind = "image" | "audio" | "video";

export interface CaptureFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  kind: CaptureKind;
  caption?: string;
  uploadedAt: string;
  blobUrl?: string;
}

export interface EventEnrichmentSpeaker {
  name: string;
  title?: string;
  company?: string;
  topic?: string;
  linkedInUrl?: string;
  role?: "host" | "speaker" | "guest";
}

export interface EventEnrichment {
  title: string;
  description: string;
  speakers: EventEnrichmentSpeaker[];
  topics: string[];
  location?: string;
  startAt?: string;
  attendeeCount?: number;
  fetchedAt: string;
  source: string;
  eventUrl: string;
}

export interface EventSession {
  id: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  eventType: EventType;
  eventUrl?: string;
  location?: string;
  eventEnrichment?: EventEnrichment;
  attendanceIntent?: string;
  rawNotes: string;
  screenshotDescriptions: string[];
  captures?: CaptureFile[];
  stage: SessionStage;
  trustLevelAtCreation: TrustLevel;
  people: Person[];
  interactions: Interaction[];
  claims: Claim[];
  themes: Theme[];
  assumptionChallenges: AssumptionChallenge[];
  contentAngles: ContentAngle[];
  followUpDrafts: FollowUpDraft[];
  contentDrafts: ContentDraft[];
  evalScores?: EvalScores;
  matteredLine?: string;
  xpEarned: number;
}

export interface OnboardingState {
  completed: boolean;
  step: number;
  loopSubStep?: number;
  skipped?: boolean;
  /** Set when the user finishes or skips the tour — not auto-migrated. */
  explicit?: boolean;
}

export interface UserProgress {
  totalXp: number;
  level: TrustLevel;
  sessionsCompleted: number;
  draftsApproved: number;
  eventsAttended: number;
  unlockedActions: string[];
  milestones: Milestone[];
  onboarding?: OnboardingState;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  unlockedAt?: string;
  xpReward: number;
}

export interface ExpertiseProfile {
  name: string;
  tagline: string;
  currentRole?: string;
  education?: string;
  expertiseAreas: string[];
  industries: string[];
  experienceHighlights?: string[];
  voiceTraits: string[];
  avoidPatterns: string[];
  pastPostExamples: string[];
  contentPriorities: string[];
  assumptionPatterns: string[];
}

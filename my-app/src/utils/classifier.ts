import { ClassificationResult, Quadrant } from '@/store/types';

// ─── Keyword Banks ──────────────────────────────────────────────
const URGENCY_KEYWORDS: [string, number][] = [
  ['asap', 30], ['urgent', 30], ['immediately', 28], ['now', 25],
  ['today', 22], ['critical', 20], ['deadline', 18], ['overdue', 25],
  ['rush', 20], ['emergency', 30], ['hurry', 18], ['tonight', 22],
  ['right away', 25], ['time-sensitive', 20], ['pressing', 18],
  ['fix', 12], ['bug', 15], ['broken', 18], ['crash', 22],
  ['blocker', 20], ['hotfix', 22],
];

const IMPORTANCE_KEYWORDS: [string, number][] = [
  ['important', 25], ['key', 18], ['essential', 25], ['strategic', 22],
  ['core', 20], ['vital', 22], ['mission-critical', 30], ['high-priority', 25],
  ['significant', 18], ['fundamental', 20], ['crucial', 25],
  ['architecture', 18], ['design', 12], ['plan', 10], ['review', 12],
  ['research', 15], ['learn', 12], ['study', 12], ['prepare', 10],
  ['proposal', 15], ['strategy', 20], ['roadmap', 18],
];

const LOW_PRIORITY_KEYWORDS: [string, number][] = [
  ['maybe', -15], ['someday', -20], ['nice to have', -18],
  ['optional', -20], ['low priority', -25], ['whenever', -15],
  ['eventually', -18], ['cleanup', -8], ['minor', -12],
  ['polish', -8], ['nice-to-have', -18],
];

// ─── Scoring Helpers ────────────────────────────────────────────
function scoreText(text: string, keywords: [string, number][]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const [keyword, weight] of keywords) {
    if (lower.includes(keyword)) {
      score += weight;
    }
  }
  return score;
}

function getDeadlineProximityScore(deadline: string | null): number {
  if (!deadline) return 0;
  const now = new Date();
  const dl = new Date(deadline);
  const hoursUntil = (dl.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil < 0) return 100;      // overdue
  if (hoursUntil < 4) return 90;       // within 4 hours
  if (hoursUntil < 12) return 75;      // within 12 hours
  if (hoursUntil < 24) return 60;      // within 1 day
  if (hoursUntil < 72) return 40;      // within 3 days
  if (hoursUntil < 168) return 20;     // within 1 week
  return 10;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function determineQuadrant(urgency: number, importance: number): Quadrant {
  const urgentThreshold = 50;
  const importantThreshold = 50;

  if (urgency >= urgentThreshold && importance >= importantThreshold) return Quadrant.DO_FIRST;
  if (urgency < urgentThreshold && importance >= importantThreshold) return Quadrant.SCHEDULE;
  if (urgency >= urgentThreshold && importance < importantThreshold) return Quadrant.DELEGATE;
  return Quadrant.ELIMINATE;
}

function generateReasoning(urgency: number, importance: number, quadrant: Quadrant, deadline: string | null): string {
  const parts: string[] = [];

  if (urgency >= 70) parts.push('High urgency detected from keywords and/or deadline proximity.');
  else if (urgency >= 40) parts.push('Moderate urgency level.');
  else parts.push('Low urgency — no time pressure detected.');

  if (importance >= 70) parts.push('This appears to be a strategically important task.');
  else if (importance >= 40) parts.push('Moderate importance level.');
  else parts.push('Lower importance — consider if this needs your attention.');

  if (deadline) {
    const hoursUntil = (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 0) parts.push('⚠️ This task is overdue!');
    else if (hoursUntil < 24) parts.push('⏰ Deadline is within 24 hours.');
    else if (hoursUntil < 72) parts.push('📅 Deadline approaching within 3 days.');
  }

  const labels: Record<Quadrant, string> = {
    [Quadrant.DO_FIRST]: '→ Placed in DO FIRST: handle this immediately.',
    [Quadrant.SCHEDULE]: '→ Placed in SCHEDULE: plan dedicated time for this.',
    [Quadrant.DELEGATE]: '→ Placed in DELEGATE: consider handing this off.',
    [Quadrant.ELIMINATE]: '→ Placed in ELIMINATE: reconsider if this is needed.',
  };
  parts.push(labels[quadrant]);

  return parts.join(' ');
}

// ─── Main Classifier ────────────────────────────────────────────
export function classifyTask(
  title: string,
  description: string = '',
  deadline: string | null = null,
): ClassificationResult {
  const fullText = `${title} ${description}`;

  // Base scores from keywords
  let rawUrgency = 35 + scoreText(fullText, URGENCY_KEYWORDS) + scoreText(fullText, LOW_PRIORITY_KEYWORDS);
  let rawImportance = 40 + scoreText(fullText, IMPORTANCE_KEYWORDS) + scoreText(fullText, LOW_PRIORITY_KEYWORDS);

  // Deadline proximity boosts urgency
  const deadlineScore = getDeadlineProximityScore(deadline);
  rawUrgency += deadlineScore * 0.4;

  // Clamp to 0-100
  const urgency = clamp(Math.round(rawUrgency), 0, 100);
  const importance = clamp(Math.round(rawImportance), 0, 100);

  const quadrant = determineQuadrant(urgency, importance);
  const priorityScore = Math.round(urgency * 0.4 + importance * 0.4 + deadlineScore * 0.2);

  const reasoning = generateReasoning(urgency, importance, quadrant, deadline);

  return { urgency, importance, quadrant, priorityScore, reasoning };
}

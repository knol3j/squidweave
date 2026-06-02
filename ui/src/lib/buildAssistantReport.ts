import { Keyword } from '../services/dataService';

export interface AutopilotResult {
  campaign?: any;
  automation?: {
    decision?: {
      plan?: { recommendedAction?: { type?: string; reason?: string } };
      targeting?: {
        topTargets?: Array<{ company?: string; targetId?: string; recommendation?: string }>;
        reengagementQueue?: Array<{ company?: string; targetId?: string; recommendedChannel?: string }>;
      };
      policyResult?: { status?: string };
      summary?: { derived?: { roas?: number; ctr?: number } };
    };
    contentPack?: { variants?: any[] };
  };
  decision?: any;
  contentPack?: { variants?: any[] };
  policy?: {
    classification?: {
      objectiveMode?: string;
      budgetMode?: string;
      budgetAmount?: number | null;
    };
  };
  executionLog?: Array<{
    stage: string;
    status: string;
    reason?: string;
    processedContacts?: number;
    processedInvestors?: number;
    channels?: string[];
  }>;
}

export function buildAssistantReport(
  prompt: string,
  result: AutopilotResult,
  campaignState: any,
  keywords: Keyword[],
): string {
  const campaign =
    result?.campaign ||
    result?.automation?.decision?.execution?.payload?.context?.campaign ||
    result?.automation?.decision?.execution?.context?.campaign ||
    result?.decision?.execution?.payload?.context?.campaign ||
    result?.decision?.execution?.context?.campaign ||
    campaignState;
  const decision = result?.automation?.decision || result?.decision;
  const contentPack = result?.automation?.contentPack || result?.contentPack;
  const action = decision?.plan?.recommendedAction;
  const policy = result?.policy;
  const executionLog = Array.isArray(result?.executionLog) ? result.executionLog : [];
  const variants = contentPack?.variants || [];
  const firstVariant = variants[0];
  const liveKeywords = keywords.map((keyword) => `- ${keyword.term}`).join('\n');
  const topTargets = decision?.targeting?.topTargets?.slice?.(0, 3) || [];
  const reengagementQueue = decision?.targeting?.reengagementQueue?.slice?.(0, 3) || [];

  return [
    '[Campaign Strategy]:',
    `Campaign objective: ${campaign?.objective || 'Not configured'}.`,
    `Prompt: ${prompt}`,
    `Primary action: ${action?.type || 'No live action'}${action?.reason ? ` because ${action.reason}` : ''}.`,
    `Locales targeted: ${(campaign?.locales || []).join(', ') || 'No locales configured'}.`,
    `Autopilot policy: objective=${policy?.classification?.objectiveMode || 'n/a'}, budget=${policy?.classification?.budgetMode || 'n/a'}${policy?.classification?.budgetAmount != null ? ` (${policy.classification.budgetAmount})` : ''}.`,
    '',
    '[Autopilot Execution Log]:',
    executionLog.length
      ? executionLog.map((entry) => `- ${entry.stage}: ${entry.status}${entry.reason ? ` (${entry.reason})` : ''}${entry.processedContacts != null ? ` contacts=${entry.processedContacts}` : ''}${entry.processedInvestors != null ? ` investors=${entry.processedInvestors}` : ''}${entry.channels ? ` channels=${entry.channels.join(',')}` : ''}`).join('\n')
      : '- No execution log available.',
    '',
    '#### Market Realities',
    `Current decision status: ${decision?.policyResult?.status || 'No live status'}.`,
    `ROAS: ${Number((decision?.summary?.derived?.roas || 0)).toFixed(2)}.`,
    `CTR: ${Number(((decision?.summary?.derived?.ctr || 0) * 100)).toFixed(2)}%.`,
    `Top ranked targets: ${topTargets.map((target: any) => `${target.company || target.targetId} (${target.recommendation})`).join(', ') || 'No ranked targets yet'}.`,
    `Reengagement queue: ${reengagementQueue.map((target: any) => `${target.company || target.targetId} via ${target.recommendedChannel || 'unassigned channel'}`).join(', ') || 'No reengagement candidates yet'}.`,
    '',
    '[Ad Copy]:',
    variants.map((variant: any) => `- ${variant.locale}: ${variant.subject} | ${variant.headline}`).join('\n') || '- No localized variants generated yet.',
    '',
    '[Social Media Posts]:',
    variants.map((variant: any) => `- ${variant.locale}: ${variant.body}`).join('\n') || '- Awaiting content generation.',
    '',
    '[Social Media Kit]:',
    firstVariant
      ? `[Instagram Reel]\nHook: ${firstVariant.headline}\nCTA: ${firstVariant.cta}\n\n[Carousel Post]\nSlide 1: ${firstVariant.subject}\nSlide 2: ${firstVariant.preheader}\n\n[LinkedIn Video/Image]\nAngle: ${firstVariant.body}`
      : 'No creative kit generated yet.',
    '',
    '[SEO Keywords]:',
    liveKeywords || '- No live keyword feed connected.',
  ].join('\n');
}

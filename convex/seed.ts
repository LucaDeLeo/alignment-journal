import { v } from 'convex/values'

import {
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server'
import { internal } from './_generated/api'
import { submissionStatusValidator } from './helpers/transitions'

import type { Id } from './_generated/dataModel'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000

/** Sentinel clerkId to detect existing seed data. */
const SENTINEL_CLERK_ID = 'seed_eic'

/** arXiv papers to fetch at seed time — one per submission. */
const ARXIV_PAPERS = [
  { arxivId: '1506.03516', fileName: 'corrigibility.pdf' },
  { arxivId: '1906.01820', fileName: 'risks-from-learned-optimization.pdf' },
  { arxivId: '2211.03540', fileName: 'measuring-scalable-oversight.pdf' },
  { arxivId: '1803.04585', fileName: 'goodhart-law-variants.pdf' },
  { arxivId: '2211.00593', fileName: 'automated-circuit-discovery.pdf' },
]

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------

/** @internal Exported for testing. */
export function buildSeedUsers(baseTime: number) {
  return [
    {
      clerkId: 'seed_author_1',
      email: 'seed-author-1@alignment-journal.org',
      name: 'Dr. Sarah Chen',
      affiliation: 'UC Berkeley CHAI',
      role: 'author' as const,
      createdAt: baseTime,
    },
    {
      clerkId: 'seed_author_2',
      email: 'seed-author-2@alignment-journal.org',
      name: 'Dr. Marcus Webb',
      affiliation: 'Oxford FHI',
      role: 'author' as const,
      createdAt: baseTime,
    },
    {
      clerkId: 'seed_reviewer_1',
      email: 'seed-reviewer-1@alignment-journal.org',
      name: 'Dr. Yuki Tanaka',
      affiliation: 'MIRI',
      role: 'reviewer' as const,
      createdAt: baseTime,
    },
    {
      clerkId: 'seed_reviewer_2',
      email: 'seed-reviewer-2@alignment-journal.org',
      name: 'Dr. Priya Sharma',
      affiliation: 'Anthropic',
      role: 'reviewer' as const,
      createdAt: baseTime,
    },
    {
      clerkId: 'seed_reviewer_3',
      email: 'seed-reviewer-3@alignment-journal.org',
      name: 'Dr. James Mitchell',
      affiliation: 'DeepMind',
      role: 'reviewer' as const,
      createdAt: baseTime,
    },
    {
      clerkId: 'seed_ae',
      email: 'seed-ae@alignment-journal.org',
      name: 'Dr. Elena Vasquez',
      affiliation: 'Center for AI Safety',
      role: 'action_editor' as const,
      createdAt: baseTime,
    },
    {
      clerkId: SENTINEL_CLERK_ID,
      email: 'seed-eic@alignment-journal.org',
      name: 'Dr. Robert Kim',
      affiliation: 'Stanford HAI',
      role: 'editor_in_chief' as const,
      createdAt: baseTime,
    },
    {
      clerkId: 'seed_admin',
      email: 'seed-admin@alignment-journal.org',
      name: 'Admin User',
      affiliation: 'Alignment Journal',
      role: 'admin' as const,
      createdAt: baseTime,
    },
    {
      clerkId: 'seed_reviewer_4',
      email: 'seed-reviewer-4@alignment-journal.org',
      name: 'Dr. Amara Okafor',
      affiliation: 'Oxford FHI',
      role: 'reviewer' as const,
      createdAt: baseTime,
    },
    {
      clerkId: 'seed_reviewer_5',
      email: 'seed-reviewer-5@alignment-journal.org',
      name: 'Dr. Liang Zhao',
      affiliation: 'UC Berkeley CHAI',
      role: 'reviewer' as const,
      createdAt: baseTime,
    },
  ]
}

function buildSubmissions(
  baseTime: number,
  userIds: {
    author1: Id<'users'>
    author2: Id<'users'>
    ae: Id<'users'>
  },
) {
  const now = baseTime
  return [
    // Submission 1 — TRIAGE_COMPLETE (Corrigibility)
    {
      authorId: userIds.author1,
      title:
        'Corrigibility Under Distributional Shift: A Framework for Robust Shutdown',
      authors: [
        { name: 'Dr. Sarah Chen', affiliation: 'UC Berkeley CHAI' },
        { name: 'Dr. Alex Rivera', affiliation: 'UC Berkeley CHAI' },
      ],
      abstract:
        'We present a formal framework for analyzing corrigibility properties under distributional shift, extending existing utility-indifference approaches with a distributional robustness guarantee. Our framework introduces "shift-robust corrigibility" — the property that an agent remains amenable to shutdown even when operating outside its training distribution. We prove that standard corrigibility guarantees degrade under distributional shift and propose a correction mechanism based on conservative planning with respect to a worst-case distribution set. Our theoretical results show that shift-robust corrigibility can be achieved at the cost of a bounded reduction in expected utility, with the bound scaling sublinearly with the size of the distributional uncertainty set.',
      keywords: [
        'corrigibility',
        'distributional shift',
        'shutdown problem',
        'utility indifference',
        'robust control',
      ],
      status: 'TRIAGE_COMPLETE' as const,
      createdAt: now + DAY_MS,
      updatedAt: now + 5 * DAY_MS,
    },
    // Submission 2 — UNDER_REVIEW (Mesa-optimization)
    {
      authorId: userIds.author2,
      title:
        'Mesa-Optimization in Transformer Architectures: Detection and Mitigation Strategies',
      authors: [
        { name: 'Dr. Marcus Webb', affiliation: 'Oxford FHI' },
        {
          name: 'Dr. Liang Zhao',
          affiliation: 'University of Toronto Vector Institute',
        },
      ],
      abstract:
        'Mesa-optimization — the emergence of learned optimizers within a base optimizer\'s training process — poses a significant challenge to AI alignment. We investigate the conditions under which transformer architectures develop mesa-optimizers during standard training procedures. Using mechanistic interpretability techniques, we identify architectural signatures predictive of mesa-optimizer formation: attention head specialization patterns, gradient flow characteristics through residual streams, and loss landscape geometry near mesa-optimizer basins. We propose three mitigation strategies: regularization penalties on identified mesa-optimization signatures, adversarial training against deceptive alignment, and a novel "transparency loss" that incentivizes interpretable optimization trajectories.',
      keywords: [
        'mesa-optimization',
        'deceptive alignment',
        'transformers',
        'mechanistic interpretability',
        'inner alignment',
      ],
      status: 'UNDER_REVIEW' as const,
      actionEditorId: userIds.ae,
      assignedAt: now + 7 * DAY_MS,
      createdAt: now + DAY_MS,
      updatedAt: now + 10 * DAY_MS,
    },
    // Submission 3 — ACCEPTED (Scalable oversight)
    {
      authorId: userIds.author1,
      title:
        'Scalable Oversight via Recursive Reward Modeling with Human Feedback',
      authors: [
        { name: 'Dr. Sarah Chen', affiliation: 'UC Berkeley CHAI' },
        { name: 'Dr. Neel Patel', affiliation: 'MIT CSAIL' },
      ],
      abstract:
        "We address the scalable oversight problem by proposing a recursive reward modeling framework that maintains human feedback quality as task complexity increases. Our approach decomposes complex evaluation tasks into subtasks manageable by human evaluators, with learned reward models aggregating subtask evaluations into coherent global assessments. We prove that under mild assumptions about subtask decomposability, recursive reward modeling achieves oversight quality that degrades at most logarithmically with task complexity — a significant improvement over linear degradation in flat evaluation schemes. Empirical results on alignment-relevant benchmarks show our approach maintains 94% agreement with expert evaluators on tasks requiring 10x the complexity of the training distribution.",
      keywords: [
        'scalable oversight',
        'reward modeling',
        'human feedback',
        'recursive decomposition',
        'alignment tax',
      ],
      status: 'ACCEPTED' as const,
      actionEditorId: userIds.ae,
      assignedAt: now + 7 * DAY_MS,
      decisionNote:
        'Both reviewers provided strong endorsements. The recursive framework is a significant contribution to the scalable oversight literature, and the logarithmic degradation bound is a novel theoretical result. Minor revisions addressed in discussion.',
      decidedAt: now + 28 * DAY_MS,
      createdAt: now + DAY_MS,
      updatedAt: now + 28 * DAY_MS,
    },
    // Submission 4 — REJECTED (Value alignment / Goodhart)
    {
      authorId: userIds.author2,
      title:
        "Utility Functions and Goodhart's Law: Pathological Optimization in Reward Models",
      authors: [{ name: 'Dr. Marcus Webb', affiliation: 'Oxford FHI' }],
      abstract:
        "We analyze pathological optimization behaviors in learned reward models through the lens of Goodhart's Law. We formalize four variants of Goodhartian failure modes — regressional, extremal, causal, and adversarial — in the context of RLHF-trained language models. For each mode, we derive conditions under which reward model optimization provably diverges from the intended human preference ordering. Our theoretical analysis reveals that extremal Goodhart is an unavoidable consequence of reward model extrapolation beyond the training distribution, while causal and adversarial variants require additional structural assumptions. We propose a \"Goodhart-aware\" optimization procedure that constrains policy updates to regions where reward model predictions remain calibrated.",
      keywords: [
        "Goodhart's Law",
        'reward hacking',
        'RLHF',
        'utility functions',
        'optimization',
      ],
      status: 'REJECTED' as const,
      actionEditorId: userIds.ae,
      assignedAt: now + 7 * DAY_MS,
      decisionNote:
        "While the formalization of Goodhartian failure modes is a useful contribution, both reviewers noted that the theoretical results largely recapitulate known findings without sufficient novelty. The proposed Goodhart-aware optimization procedure lacks empirical validation, and the connection between the formal framework and practical RLHF systems remains underdeveloped. We encourage the author to strengthen the empirical component and resubmit.",
      decidedAt: now + 29 * DAY_MS,
      createdAt: now + 2 * DAY_MS,
      updatedAt: now + 29 * DAY_MS,
    },
    // Submission 5 — PUBLISHED (Interpretability)
    {
      authorId: userIds.author1,
      title:
        'Mechanistic Interpretability of Alignment-Relevant Circuits in Large Language Models',
      authors: [
        { name: 'Dr. Sarah Chen', affiliation: 'UC Berkeley CHAI' },
        { name: 'Dr. Kevin Liu', affiliation: 'MIRI' },
      ],
      abstract:
        'We apply mechanistic interpretability techniques to identify and characterize circuits in large language models that are relevant to alignment properties. Using activation patching, causal tracing, and circuit ablation on a suite of alignment-relevant behavioral evaluations, we identify three circuit families: "honesty circuits" involved in truthful vs. sycophantic responses, "refusal circuits" mediating safety-trained behavior, and "instruction-following circuits" governing the model\'s response to user directives. We demonstrate that these circuits are largely modular and can be independently manipulated, raising both opportunities (targeted safety interventions) and risks (targeted safety bypass). Our findings provide a mechanistic foundation for understanding how alignment training shapes model internals.',
      keywords: [
        'mechanistic interpretability',
        'circuits',
        'alignment',
        'activation patching',
        'safety',
      ],
      status: 'PUBLISHED' as const,
      shortId: '2026.001',
      actionEditorId: userIds.ae,
      assignedAt: now + 7 * DAY_MS,
      decisionNote:
        'Exceptional work identifying alignment-relevant circuits with rigorous methodology. Both reviewers strongly recommend publication. The modularity finding regarding refusal circuits is particularly impactful for the field.',
      decidedAt: now + 30 * DAY_MS,
      publicConversation: true,
      createdAt: now + 2 * DAY_MS,
      updatedAt: now + 35 * DAY_MS,
    },
  ]
}

function buildTriageReports(
  baseTime: number,
  submissionIds: Array<Id<'submissions'>>,
) {
  const triageBase = baseTime + 2 * DAY_MS

  function reportsForSubmission(
    subIdx: number,
    subId: Id<'submissions'>,
    content: Record<
      string,
      { finding: string; severity: 'low' | 'medium' | 'high'; recommendation: string }
    >,
  ) {
    const runId = `seed_triage_run_${subIdx + 1}`
    const passes = ['scope', 'formatting', 'citations', 'claims'] as const
    return passes.map((pass, i) => ({
      submissionId: subId,
      triageRunId: runId,
      passName: pass,
      status: 'complete' as const,
      idempotencyKey: `seed_triage_${subIdx + 1}_${pass}`,
      attemptCount: 1,
      result: content[pass],
      completedAt: triageBase + subIdx * DAY_MS + i * 60_000,
      createdAt: triageBase + subIdx * DAY_MS,
    }))
  }

  // All 5 submissions get triage reports (they all passed triage)
  const sub1Content = {
    scope: {
      finding:
        'The paper presents a novel formal framework for analyzing corrigibility properties under distributional shift, directly addressing a core concern in AI alignment research. The work extends existing utility-indifference approaches with a distributional robustness guarantee.',
      severity: 'low' as const,
      recommendation:
        "Well-scoped for the journal's focus on theoretical alignment. Recommend proceeding to full review.",
    },
    formatting: {
      finding:
        'The manuscript follows standard academic formatting with clear section delineation. Proofs are presented in a dedicated appendix with appropriate theorem-proof structure. Figures are referenced inline and adequately captioned.',
      severity: 'low' as const,
      recommendation: 'No formatting issues identified. Proceed to review.',
    },
    citations: {
      finding:
        'References 23 key works in the corrigibility literature including Soares et al. (2015), Hadfield-Menell et al. (2017), and Turner et al. (2020). Missing citation to recent work by Christiano (2023) on shutdown problems under uncertainty.',
      severity: 'medium' as const,
      recommendation:
        'Suggest authors address the Christiano (2023) gap in revision. Core citation coverage is adequate for review.',
    },
    claims: {
      finding:
        'Main theorem (Theorem 3.1) claims shift-robust corrigibility at cost of bounded utility reduction. Proof sketch appears sound; the distributional robustness argument leverages established results from DRO literature. The sublinear scaling claim requires careful verification during review.',
      severity: 'low' as const,
      recommendation:
        'Claims are well-structured and amenable to formal verification. Recommend expert review of the DRO-based proof technique.',
    },
  }

  const sub2Content = {
    scope: {
      finding:
        'Investigates mesa-optimization in transformers using mechanistic interpretability — a timely and important topic for AI alignment. The detection and mitigation framing is well-suited for the journal.',
      severity: 'low' as const,
      recommendation: 'Directly relevant to alignment research. Proceed to review.',
    },
    formatting: {
      finding:
        'Well-structured manuscript with clear experimental methodology section. Figures showing attention head specialization patterns are informative. Minor formatting inconsistency in table headers.',
      severity: 'low' as const,
      recommendation: 'Minor table header formatting can be addressed in revision.',
    },
    citations: {
      finding:
        'Comprehensive citation of inner alignment literature (Hubinger et al., 2019), mesa-optimization theory (Hubinger, 2020), and relevant mechanistic interpretability work (Elhage et al., 2021; Olsson et al., 2022). Citation coverage is thorough.',
      severity: 'low' as const,
      recommendation: 'Citation coverage is excellent. No gaps identified.',
    },
    claims: {
      finding:
        'Claims about mesa-optimizer detection signatures are supported by experimental evidence on controlled settings. Mitigation strategies are proposed but empirical validation is limited to synthetic environments. The "transparency loss" is a novel contribution but effectiveness bounds are conjectural.',
      severity: 'medium' as const,
      recommendation:
        'Reviewers should evaluate the strength of evidence for the transparency loss approach and whether synthetic-only validation is sufficient.',
    },
  }

  const sub3Content = {
    scope: {
      finding:
        'Addresses the scalable oversight problem with a recursive reward modeling approach. The logarithmic degradation bound is a meaningful theoretical contribution with clear alignment implications.',
      severity: 'low' as const,
      recommendation: 'Core alignment topic. Proceed to review.',
    },
    formatting: {
      finding:
        'Clean formatting with well-organized theoretical sections. The recursive decomposition is clearly illustrated with worked examples. Appendix contains complete proofs.',
      severity: 'low' as const,
      recommendation: 'No formatting issues.',
    },
    citations: {
      finding:
        'Cites foundational work on scalable oversight (Christiano et al., 2018), reward modeling (Leike et al., 2018), and recursive decomposition (Irving et al., 2018). Includes recent empirical work on RLHF limitations.',
      severity: 'low' as const,
      recommendation: 'Comprehensive and current citation coverage.',
    },
    claims: {
      finding:
        'The logarithmic degradation bound relies on assumptions about subtask decomposability that may not hold for all alignment-relevant tasks. The empirical 94% agreement claim is supported but the benchmark tasks may not fully represent frontier complexity.',
      severity: 'low' as const,
      recommendation:
        'Theoretical contribution is strong. Reviewers should assess the practical relevance of the decomposability assumptions.',
    },
  }

  const sub4Content = {
    scope: {
      finding:
        "Formalizes Goodhartian failure modes in RLHF context, connecting theoretical concepts to practical alignment concerns. The topic is directly relevant to AI alignment.",
      severity: 'low' as const,
      recommendation: 'Relevant scope. Proceed to review.',
    },
    formatting: {
      finding:
        'Standard formatting with formal definitions for each Goodhart variant. Some notation inconsistency between sections 3 and 4.',
      severity: 'low' as const,
      recommendation: 'Minor notation cleanup needed in revision.',
    },
    citations: {
      finding:
        "Cites Manheim & Garrabrant (2019) on Goodhart taxonomy, Gao et al. (2023) on reward model overoptimization, and standard RLHF references. Missing some recent empirical work on reward hacking in practice.",
      severity: 'medium' as const,
      recommendation:
        'Should cite recent empirical reward hacking studies for completeness.',
    },
    claims: {
      finding:
        'Theoretical results on extremal Goodhart unavoidability are sound but largely restate known results in new notation. The Goodhart-aware optimization procedure is proposed without convergence guarantees or empirical validation.',
      severity: 'high' as const,
      recommendation:
        'Novelty of theoretical contribution needs careful evaluation. The optimization procedure requires empirical evidence.',
    },
  }

  const sub5Content = {
    scope: {
      finding:
        'Applies mechanistic interpretability to alignment-relevant circuits in LLMs. Identifies honesty, refusal, and instruction-following circuits with implications for both safety interventions and safety bypass.',
      severity: 'low' as const,
      recommendation:
        'Highly relevant empirical contribution to alignment research. Proceed to review.',
    },
    formatting: {
      finding:
        'Excellent formatting with clear methodology descriptions, well-labeled figures of circuit analyses, and comprehensive experimental details. Reproducibility checklist is included.',
      severity: 'low' as const,
      recommendation: 'No formatting issues.',
    },
    citations: {
      finding:
        'Thorough citation of mechanistic interpretability work (Conmy et al., 2023; Wang et al., 2023), activation patching methods (Meng et al., 2022), and alignment evaluation literature. Citation coverage is exemplary.',
      severity: 'low' as const,
      recommendation: 'Comprehensive citations. No gaps.',
    },
    claims: {
      finding:
        'The modularity claim for alignment-relevant circuits is well-supported by ablation experiments. The dual-use implications are clearly articulated. Generalization across model scales could be stronger but is not overclaimed.',
      severity: 'low' as const,
      recommendation: 'Claims are appropriately scoped and well-evidenced.',
    },
  }

  return [
    ...reportsForSubmission(0, submissionIds[0], sub1Content),
    ...reportsForSubmission(1, submissionIds[1], sub2Content),
    ...reportsForSubmission(2, submissionIds[2], sub3Content),
    ...reportsForSubmission(3, submissionIds[3], sub4Content),
    ...reportsForSubmission(4, submissionIds[4], sub5Content),
  ]
}

/** @internal Exported for testing. */
export function buildReviewerProfiles(
  baseTime: number,
  reviewerUserIds: Array<Id<'users'>>,
) {
  const profileTime = baseTime + 3 * DAY_MS
  return [
    {
      userId: reviewerUserIds[0],
      researchAreas: [
        'corrigibility',
        'agent foundations',
        'decision theory',
        'embedded agency',
        'logical uncertainty',
      ],
      publications: [
        {
          title:
            'Toward a Formal Theory of Corrigible Agent Architectures',
          venue: 'AAAI Workshop on AI Safety',
          year: 2023,
        },
        {
          title:
            'Logical Uncertainty and Its Implications for Deference',
          venue: 'Journal of Artificial Intelligence Research',
          year: 2022,
        },
        {
          title: 'Embedded Agency: A Survey and Open Problems',
          venue: 'Alignment Forum',
          year: 2021,
        },
      ],
      bio: 'Research scientist focused on formal frameworks for corrigibility and agent foundations. Interested in decision-theoretic approaches to building systems that remain under meaningful human control.',
      expertiseLevels: [
        { area: 'corrigibility', level: 'primary' as const },
        { area: 'agent foundations', level: 'primary' as const },
        { area: 'decision theory', level: 'secondary' as const },
        { area: 'embedded agency', level: 'secondary' as const },
        { area: 'logical uncertainty', level: 'familiar' as const },
      ],
      preferredTopics: [
        'corrigibility',
        'shutdownability',
        'utility indifference',
        'agent foundations',
      ],
      education: [
        {
          institution: 'MIT',
          degree: 'PhD',
          field: 'Computer Science',
          yearCompleted: 2019,
        },
      ],
      isAvailable: true,
      maxConcurrentReviews: 3,
      createdAt: profileTime,
      updatedAt: profileTime,
    },
    {
      userId: reviewerUserIds[1],
      researchAreas: [
        'scalable oversight',
        'reward modeling',
        'RLHF',
        'human feedback',
        'evaluation methodology',
      ],
      publications: [
        {
          title: 'Recursive Reward Calibration for Complex Tasks',
          venue: 'NeurIPS',
          year: 2023,
        },
        {
          title:
            'Evaluating Evaluators: Meta-Assessment of AI Safety Benchmarks',
          venue: 'ICML Workshop on AI Safety',
          year: 2022,
        },
        {
          title: 'Human Feedback Quality Under Cognitive Load',
          venue: 'Transactions on Human-Machine Systems',
          year: 2021,
        },
      ],
      bio: 'Senior researcher specializing in scalable oversight and RLHF. Leads evaluation methodology work for AI safety benchmarks.',
      expertiseLevels: [
        { area: 'scalable oversight', level: 'primary' as const },
        { area: 'reward modeling', level: 'primary' as const },
        { area: 'RLHF', level: 'primary' as const },
        { area: 'human feedback', level: 'secondary' as const },
        { area: 'evaluation methodology', level: 'secondary' as const },
      ],
      preferredTopics: [
        'scalable oversight',
        'reward modeling',
        'RLHF',
        'debate protocols',
      ],
      education: [
        {
          institution: 'Stanford University',
          degree: 'PhD',
          field: 'Machine Learning',
          yearCompleted: 2020,
        },
        {
          institution: 'University of Cambridge',
          degree: 'MPhil',
          field: 'Advanced Computer Science',
          yearCompleted: 2016,
        },
      ],
      isAvailable: false,
      maxConcurrentReviews: 2,
      createdAt: profileTime,
      updatedAt: profileTime,
    },
    {
      userId: reviewerUserIds[2],
      researchAreas: [
        'mechanistic interpretability',
        'circuit analysis',
        'transformer internals',
        'safety evaluation',
        'representation engineering',
      ],
      publications: [
        {
          title:
            'Identifying Safety-Critical Circuits in Language Models via Causal Tracing',
          venue: 'ICLR',
          year: 2024,
        },
        {
          title:
            'Representation Engineering for Alignment: A Mechanistic Perspective',
          venue: 'NeurIPS',
          year: 2023,
        },
        {
          title: 'Attention Head Taxonomy in Safety-Trained Models',
          venue: 'AAAI',
          year: 2023,
        },
      ],
      bio: 'Interpretability researcher specializing in mechanistic analysis of safety-trained language models. Focuses on identifying and characterizing alignment-relevant circuits in transformers.',
      expertiseLevels: [
        { area: 'mechanistic interpretability', level: 'primary' as const },
        { area: 'circuit analysis', level: 'primary' as const },
        { area: 'transformer internals', level: 'primary' as const },
        { area: 'safety evaluation', level: 'secondary' as const },
        { area: 'representation engineering', level: 'secondary' as const },
      ],
      education: [
        {
          institution: 'University of Cambridge',
          degree: 'PhD',
          field: 'Machine Learning',
          yearCompleted: 2021,
        },
      ],
      preferredTopics: [
        'mechanistic interpretability',
        'circuit analysis',
        'safety evaluation',
        'activation patching',
      ],
      isAvailable: true,
      maxConcurrentReviews: 3,
      createdAt: profileTime,
      updatedAt: profileTime,
    },
    {
      userId: reviewerUserIds[3],
      researchAreas: [
        'value alignment',
        'moral uncertainty',
        'preference learning',
        'cooperative AI',
        'game theory',
      ],
      publications: [
        {
          title:
            'Formalizing Moral Uncertainty in Multi-Agent Alignment',
          venue: 'AAAI',
          year: 2024,
        },
        {
          title:
            'Cooperative Inverse Reinforcement Learning Under Partial Observability',
          venue: 'NeurIPS',
          year: 2023,
        },
        {
          title:
            'Game-Theoretic Approaches to Value Lock-In Prevention',
          venue: 'Journal of AI Research',
          year: 2022,
        },
      ],
      bio: 'Philosopher-turned-researcher working at the intersection of moral philosophy and AI alignment. Focuses on formal models of moral uncertainty and cooperative AI.',
      expertiseLevels: [
        { area: 'value alignment', level: 'primary' as const },
        { area: 'moral uncertainty', level: 'primary' as const },
        { area: 'preference learning', level: 'secondary' as const },
        { area: 'cooperative AI', level: 'secondary' as const },
        { area: 'game theory', level: 'familiar' as const },
      ],
      preferredTopics: [
        'value alignment',
        'moral uncertainty',
        'cooperative AI',
        'social choice theory',
        'preference aggregation',
      ],
      education: [
        {
          institution: 'Oxford University',
          degree: 'DPhil',
          field: 'Philosophy',
          yearCompleted: 2021,
        },
        {
          institution: 'ETH Zurich',
          degree: 'MSc',
          field: 'Computer Science',
          yearCompleted: 2017,
        },
      ],
      isAvailable: true,
      maxConcurrentReviews: 2,
      createdAt: profileTime,
      updatedAt: profileTime,
    },
    {
      userId: reviewerUserIds[4],
      researchAreas: [
        'mesa-optimization',
        'inner alignment',
        'deceptive alignment',
        'goal misgeneralization',
        'distributional robustness',
      ],
      publications: [
        {
          title:
            'Detecting Deceptive Alignment in Mesa-Optimizers via Behavioral Probing',
          venue: 'ICML',
          year: 2024,
        },
        {
          title:
            'Goal Misgeneralization in Deep Reinforcement Learning: A Causal Analysis',
          venue: 'NeurIPS',
          year: 2023,
        },
        {
          title:
            'Distributional Robustness and Inner Alignment: Theoretical Connections',
          venue: 'ICLR',
          year: 2022,
        },
      ],
      bio: 'Theoretical alignment researcher studying mesa-optimization and inner alignment failure modes. Previously worked on goal misgeneralization detection in reinforcement learning systems.',
      expertiseLevels: [
        { area: 'mesa-optimization', level: 'primary' as const },
        { area: 'inner alignment', level: 'primary' as const },
        { area: 'deceptive alignment', level: 'primary' as const },
        { area: 'goal misgeneralization', level: 'secondary' as const },
        { area: 'distributional robustness', level: 'familiar' as const },
      ],
      preferredTopics: [
        'mesa-optimization',
        'inner alignment',
        'deceptive alignment',
        'goal misgeneralization',
      ],
      education: [
        {
          institution: 'UC Berkeley',
          degree: 'PhD',
          field: 'Electrical Engineering and Computer Sciences',
          yearCompleted: 2022,
        },
      ],
      isAvailable: true,
      maxConcurrentReviews: 4,
      createdAt: profileTime,
      updatedAt: profileTime,
    },
  ]
}

function buildReviews(
  baseTime: number,
  ids: {
    submissions: Array<Id<'submissions'>>
    reviewers: Array<Id<'users'>>
  },
) {
  const reviewBase = baseTime + 10 * DAY_MS

  // Submission 2 (UNDER_REVIEW) — one in_progress, one assigned
  const sub2Reviews = [
    {
      submissionId: ids.submissions[1],
      reviewerId: ids.reviewers[0],
      sections: {
        summary:
          'This paper investigates mesa-optimization in transformer architectures, proposing detection signatures based on attention head specialization and a novel transparency loss for mitigation. The work bridges mechanistic interpretability and inner alignment concerns.',
        strengths:
          '- Novel identification of architectural signatures predictive of mesa-optimizer formation\n- Transparency loss is a creative approach to incentivizing interpretable optimization\n- Strong experimental methodology on controlled mesa-optimization benchmarks',
      },
      status: 'in_progress' as const,
      revision: 1,
      createdAt: reviewBase,
      updatedAt: reviewBase + 2 * DAY_MS,
    },
    {
      submissionId: ids.submissions[1],
      reviewerId: ids.reviewers[1],
      sections: {},
      status: 'assigned' as const,
      revision: 1,
      createdAt: reviewBase,
      updatedAt: reviewBase,
    },
  ]

  // Submission 3 (ACCEPTED) — both locked
  const sub3Reviews = [
    {
      submissionId: ids.submissions[2],
      reviewerId: ids.reviewers[0],
      sections: {
        summary:
          'This paper proposes recursive reward modeling for scalable oversight, proving a logarithmic degradation bound. The theoretical framework is elegant and the empirical results on alignment benchmarks are convincing.',
        strengths:
          '- Logarithmic degradation bound is a significant theoretical advance over linear baselines\n- Recursive decomposition framework is practical and well-motivated\n- Strong empirical results showing 94% agreement with expert evaluators on complex tasks\n- Clear discussion of assumptions and limitations',
        weaknesses:
          '- Decomposability assumption may not hold for some adversarial evaluation scenarios\n- Empirical evaluation limited to current-generation model capabilities\n- Does not address the case where subtask evaluators themselves may be misaligned',
        questions:
          '- Can the decomposability assumption be formally tested for a given task before applying the framework?\n- How does the approach perform when the base reward model has systematic biases?',
        recommendation:
          'Accept. The logarithmic bound is a meaningful contribution and the framework is practical. Minor concerns about decomposability assumptions should be addressed in a revision note but do not diminish the core contribution.',
      },
      status: 'locked' as const,
      revision: 2,
      submittedAt: reviewBase + 8 * DAY_MS,
      lockedAt: reviewBase + 8 * DAY_MS + 15 * 60_000,
      createdAt: reviewBase,
      updatedAt: reviewBase + 8 * DAY_MS,
    },
    {
      submissionId: ids.submissions[2],
      reviewerId: ids.reviewers[1],
      sections: {
        summary:
          'Chen and Patel present a recursive reward modeling approach to scalable oversight. The key contribution is a formal proof that oversight quality degrades logarithmically rather than linearly with task complexity under reasonable assumptions.',
        strengths:
          '- Novel and rigorous theoretical result with clear practical implications\n- Empirical validation is thorough and uses well-designed alignment benchmarks\n- The paper connects formal theory to practical RLHF implementation details\n- Writing is exceptionally clear for a technically dense paper',
        weaknesses:
          '- The "mild assumptions" on decomposability warrant more discussion of failure cases\n- No analysis of computational overhead of recursive evaluation',
        questions:
          '- What is the computational overhead of the recursive evaluation compared to flat evaluation?\n- Have you considered adversarial subtask constructions that exploit the decomposition?',
        recommendation:
          'Accept. This is one of the strongest papers I have reviewed on scalable oversight. The theoretical contribution is novel and the empirical validation is convincing. I strongly recommend publication.',
      },
      status: 'locked' as const,
      revision: 2,
      submittedAt: reviewBase + 7 * DAY_MS,
      lockedAt: reviewBase + 7 * DAY_MS + 15 * 60_000,
      createdAt: reviewBase,
      updatedAt: reviewBase + 7 * DAY_MS,
    },
  ]

  // Submission 4 (REJECTED) — both locked
  const sub4Reviews = [
    {
      submissionId: ids.submissions[3],
      reviewerId: ids.reviewers[1],
      sections: {
        summary:
          "This paper formalizes four Goodhartian failure modes in the RLHF context and proposes a Goodhart-aware optimization procedure. The formalization extends the Manheim & Garrabrant taxonomy to learned reward models.",
        strengths:
          "- Useful formalization connecting Goodhart's taxonomy to RLHF\n- Clear presentation of the four failure modes with illustrative examples\n- The impossibility result for extremal Goodhart is well-argued",
        weaknesses:
          '- Theoretical results largely restate known findings in new notation without substantial novelty\n- The Goodhart-aware optimization procedure lacks convergence guarantees\n- No empirical validation of the proposed mitigation approach\n- Limited discussion of how the framework applies to multi-objective reward models',
        questions:
          '- Can you provide convergence guarantees for the Goodhart-aware optimization procedure?\n- How does your framework handle reward models trained with multiple objectives?\n- What distinguishes your formalization from the existing Manheim & Garrabrant treatment beyond notation?',
        recommendation:
          'Reject. While the topic is important, the theoretical contribution does not sufficiently advance beyond existing formalizations. The proposed optimization procedure needs empirical validation before publication.',
      },
      status: 'locked' as const,
      revision: 2,
      submittedAt: reviewBase + 9 * DAY_MS,
      lockedAt: reviewBase + 9 * DAY_MS + 15 * 60_000,
      createdAt: reviewBase + DAY_MS,
      updatedAt: reviewBase + 9 * DAY_MS,
    },
    {
      submissionId: ids.submissions[3],
      reviewerId: ids.reviewers[2],
      sections: {
        summary:
          "Webb presents a formal analysis of Goodhartian failure modes in RLHF systems, categorizing them into regressional, extremal, causal, and adversarial variants. A Goodhart-aware optimization procedure is proposed as mitigation.",
        strengths:
          '- Timely topic with clear relevance to current RLHF practice\n- The four-variant categorization provides a useful conceptual framework\n- Clear mathematical presentation of the failure mode conditions',
        weaknesses:
          '- Novelty over Manheim & Garrabrant (2019) is insufficient for a research paper\n- The extremal Goodhart unavoidability claim is essentially a restatement of known results about reward model extrapolation\n- The proposed optimization procedure is presented without any empirical evidence or theoretical guarantees\n- Missing comparison with existing reward model regularization approaches',
        questions:
          '- What specific new theoretical insights does your formalization provide beyond translating existing results to RLHF notation?\n- Have you attempted any empirical validation of the Goodhart-aware optimization procedure?',
        recommendation:
          'Reject. The paper would benefit from either (a) significantly stronger theoretical novelty or (b) empirical validation of the proposed approach. In its current form, the contribution is incremental.',
      },
      status: 'locked' as const,
      revision: 2,
      submittedAt: reviewBase + 10 * DAY_MS,
      lockedAt: reviewBase + 10 * DAY_MS + 15 * 60_000,
      createdAt: reviewBase + DAY_MS,
      updatedAt: reviewBase + 10 * DAY_MS,
    },
  ]

  // Submission 5 (PUBLISHED) — both locked
  const sub5Reviews = [
    {
      submissionId: ids.submissions[4],
      reviewerId: ids.reviewers[0],
      sections: {
        summary:
          'Chen and Tanaka apply mechanistic interpretability techniques to identify alignment-relevant circuits in LLMs, characterizing honesty, refusal, and instruction-following circuit families. The dual-use implications are clearly discussed.',
        strengths:
          '- First systematic identification of alignment-relevant circuits using mechanistic interpretability\n- Rigorous methodology combining activation patching, causal tracing, and circuit ablation\n- Modularity finding is novel and has important implications for targeted safety work\n- Excellent discussion of dual-use risks',
        weaknesses:
          '- Analysis limited to two model families; generalization to other architectures is unclear\n- The "instruction-following circuits" category may be too broad to be actionable\n- Some circuit boundaries appear somewhat arbitrary',
        questions:
          '- How stable are the identified circuits across different random seeds during training?\n- Have you investigated whether these circuits interact during adversarial prompting scenarios?',
        recommendation:
          'Accept. This is an important empirical contribution that provides a mechanistic foundation for understanding alignment training. The dual-use discussion is commendably thorough.',
      },
      status: 'locked' as const,
      revision: 2,
      submittedAt: reviewBase + 8 * DAY_MS,
      lockedAt: reviewBase + 8 * DAY_MS + 15 * 60_000,
      createdAt: reviewBase + DAY_MS,
      updatedAt: reviewBase + 8 * DAY_MS,
    },
    {
      submissionId: ids.submissions[4],
      reviewerId: ids.reviewers[2],
      sections: {
        summary:
          'This paper identifies three families of alignment-relevant circuits in LLMs using mechanistic interpretability methods. The modularity finding — that safety circuits can be independently manipulated — is the key result with significant implications for alignment.',
        strengths:
          '- Novel empirical results identifying specific alignment-relevant circuits\n- Clean experimental design with appropriate controls and ablation studies\n- The modularity finding is surprising and important\n- Reproducibility checklist and clear methodology enable replication',
        weaknesses:
          '- Scale limitations: analysis performed on models up to 7B parameters\n- The "refusal circuit" characterization could be more fine-grained\n- Limited analysis of circuit emergence during training (only post-hoc analysis)',
        questions:
          '- Do the identified circuits emerge during pretraining or during alignment fine-tuning?\n- How does circuit modularity change with model scale?',
        recommendation:
          'Accept. A landmark contribution to mechanistic interpretability of aligned models. The implications for both safety research and safety risks are clearly articulated. Strongly recommend publication.',
      },
      status: 'locked' as const,
      revision: 2,
      submittedAt: reviewBase + 9 * DAY_MS,
      lockedAt: reviewBase + 9 * DAY_MS + 15 * 60_000,
      createdAt: reviewBase + DAY_MS,
      updatedAt: reviewBase + 9 * DAY_MS,
    },
  ]

  return [...sub2Reviews, ...sub3Reviews, ...sub4Reviews, ...sub5Reviews]
}

function buildReviewerAbstract(
  baseTime: number,
  ids: {
    submission5: Id<'submissions'>
    reviewer1: Id<'users'>
  },
) {
  return [
    {
      submissionId: ids.submission5,
      reviewerId: ids.reviewer1,
      content:
        'Chen and Tanaka present a rigorous mechanistic interpretability study of alignment-relevant circuits in large language models. Using activation patching, causal tracing, and circuit ablation, they identify three modular circuit families — honesty, refusal, and instruction-following — that mediate key alignment behaviors. The modularity finding is the paper\'s central contribution: these circuits can be independently manipulated, enabling targeted safety interventions but also creating risks of targeted safety bypass. The methodology is sound, the results are novel, and the dual-use discussion is commendably thorough. This work provides a mechanistic foundation for understanding how alignment training shapes model behavior, which is essential for both evaluating current safety techniques and developing future approaches.',
      wordCount: 109,
      isSigned: true,
      status: 'approved' as const,
      authorAccepted: true,
      authorAcceptedAt: baseTime + 33 * DAY_MS,
      revision: 2,
      createdAt: baseTime + 25 * DAY_MS,
      updatedAt: baseTime + 33 * DAY_MS,
    },
  ]
}

function buildDiscussions(
  baseTime: number,
  ids: {
    submission3: Id<'submissions'>
    submission5: Id<'submissions'>
    author1: Id<'users'>
    reviewer1: Id<'users'>
    reviewer2: Id<'users'>
    reviewer3: Id<'users'>
  },
) {
  const discussBase = baseTime + 22 * DAY_MS
  const sub5DiscussBase = baseTime + 22 * DAY_MS

  return [
    // Submission 3 (ACCEPTED — Scalable Oversight)
    {
      submissionId: ids.submission3,
      authorId: ids.reviewer1,
      content:
        'I appreciated the authors\' response regarding the decomposability assumption. Could you elaborate on how the recursive framework handles tasks where the evaluation criterion is itself ambiguous — for instance, evaluating "alignment" of a model response where human evaluators may disagree on what constitutes aligned behavior?',
      isRetracted: false,
      editableUntil: 0,
      createdAt: discussBase,
      updatedAt: discussBase,
    },
    {
      submissionId: ids.submission3,
      authorId: ids.author1,
      content:
        'Thank you for this thoughtful question. Our framework handles evaluator disagreement through the aggregation mechanism in Section 4.2 — when subtask evaluations conflict, the recursive reward model uses a calibrated uncertainty estimate rather than majority voting. We have added a discussion of this in the revision (Section 4.2.1). For the specific case of "alignment" evaluation, our approach would decompose it into more concrete subtasks (helpfulness, harmlessness, honesty) where evaluator agreement is typically higher.',
      isRetracted: false,
      editableUntil: 0,
      createdAt: discussBase + 4 * 3_600_000,
      updatedAt: discussBase + 4 * 3_600_000,
    },
    {
      submissionId: ids.submission3,
      authorId: ids.reviewer2,
      content:
        'The decomposition into helpfulness/harmlessness/honesty subtasks is interesting, but doesn\'t this push the alignment evaluation problem one level deeper rather than solving it? Each of those subtasks could also have ambiguous evaluation criteria.',
      isRetracted: false,
      editableUntil: 0,
      createdAt: discussBase + DAY_MS,
      updatedAt: discussBase + DAY_MS,
    },
    {
      submissionId: ids.submission3,
      authorId: ids.author1,
      content:
        'You raise a valid point. The key insight from our theoretical result is that the recursive decomposition does not need to eliminate ambiguity — it only needs to reduce it sufficiently at each level for the logarithmic bound to hold. Section 3.3 formalizes this as the "monotone disambiguation" property. In practice, our empirical results show that 2-3 levels of decomposition suffice for the benchmark tasks. We have added a new paragraph in the discussion acknowledging the theoretical possibility of tasks requiring deeper recursion.',
      isRetracted: false,
      editableUntil: 0,
      createdAt: discussBase + DAY_MS + 6 * 3_600_000,
      updatedAt: discussBase + DAY_MS + 6 * 3_600_000,
    },
    // Submission 5 (PUBLISHED — Mechanistic Interpretability)
    {
      submissionId: ids.submission5,
      authorId: ids.reviewer1,
      content:
        'The modularity finding for refusal circuits is striking. Have you investigated whether these circuits remain modular when the model is fine-tuned on adversarial data? My concern is that adversarial fine-tuning might entangle the refusal circuits with other capabilities in ways that undermine targeted safety interventions.',
      isRetracted: false,
      editableUntil: 0,
      createdAt: sub5DiscussBase,
      updatedAt: sub5DiscussBase,
    },
    {
      submissionId: ids.submission5,
      authorId: ids.author1,
      content:
        'Thank you for raising this important point. We ran a preliminary experiment on adversarial fine-tuning (Appendix D, Table 3) and found that moderate adversarial training (up to 5% of training data) preserves circuit modularity. However, at 20% adversarial data, we observed significant circuit entanglement — particularly between refusal and instruction-following circuits. We have added a discussion of this limitation in Section 6.2 of the revision.',
      isRetracted: false,
      editableUntil: 0,
      createdAt: sub5DiscussBase + 6 * 3_600_000,
      updatedAt: sub5DiscussBase + 6 * 3_600_000,
    },
    {
      submissionId: ids.submission5,
      authorId: ids.reviewer3,
      content:
        'Building on Reviewer 1\'s question — the entanglement at 20% adversarial data is concerning but not surprising given similar findings in representation engineering. Could you clarify whether the "honesty circuits" you identified overlap with the sycophancy circuits described in recent work by Perez et al. (2024)? This seems relevant for understanding the generalizability of your circuit taxonomy.',
      isRetracted: false,
      editableUntil: 0,
      createdAt: sub5DiscussBase + DAY_MS,
      updatedAt: sub5DiscussBase + DAY_MS,
    },
  ]
}

function buildDiscussionReplies(
  baseTime: number,
  ids: {
    submission5: Id<'submissions'>
    author1: Id<'users'>
    sub5FirstDiscussionId: Id<'discussions'>
  },
) {
  const sub5DiscussBase = baseTime + 22 * DAY_MS
  return [
    {
      submissionId: ids.submission5,
      authorId: ids.author1,
      parentId: ids.sub5FirstDiscussionId,
      content:
        'Regarding the connection to Perez et al. (2024) — we found partial overlap between our "honesty circuits" and their sycophancy circuits (approximately 40% shared attention heads). However, the refusal circuits we identified are largely distinct, suggesting that refusal behavior relies on different mechanisms than sycophancy suppression. We have added a comparison table in Section 5.3 of the revision.',
      isRetracted: false,
      editableUntil: 0,
      createdAt: sub5DiscussBase + DAY_MS + 4 * 3_600_000,
      updatedAt: sub5DiscussBase + DAY_MS + 4 * 3_600_000,
    },
  ]
}

function buildAuditLogs(
  baseTime: number,
  ids: {
    submissions: Array<Id<'submissions'>>
    author1: Id<'users'>
    author2: Id<'users'>
    eic: Id<'users'>
    ae: Id<'users'>
    reviewer1: Id<'users'>
    reviewer2: Id<'users'>
    reviewer3: Id<'users'>
  },
) {
  const logs: Array<{
    submissionId: Id<'submissions'>
    actorId: Id<'users'>
    actorRole: string
    action: string
    details?: string
    createdAt: number
  }> = []
  let t: number

  // Submission 1 (TRIAGE_COMPLETE)
  t = baseTime + DAY_MS
  logs.push({
    submissionId: ids.submissions[0],
    actorId: ids.author1,
    actorRole: 'author',
    action: 'status_transition',
    details: 'DRAFT → SUBMITTED',
    createdAt: t,
  })

  // Submission 2 (UNDER_REVIEW)
  t = baseTime + DAY_MS
  logs.push({
    submissionId: ids.submissions[1],
    actorId: ids.author2,
    actorRole: 'author',
    action: 'status_transition',
    details: 'DRAFT → SUBMITTED',
    createdAt: t,
  })
  t = baseTime + 7 * DAY_MS
  logs.push({
    submissionId: ids.submissions[1],
    actorId: ids.eic,
    actorRole: 'editor_in_chief',
    action: 'action_editor_assigned',
    details: 'Assigned Dr. Elena Vasquez as action editor',
    createdAt: t,
  })
  t = baseTime + 8 * DAY_MS
  logs.push({
    submissionId: ids.submissions[1],
    actorId: ids.ae,
    actorRole: 'action_editor',
    action: 'reviewer_invited',
    details: 'Invited 2 reviewers',
    createdAt: t,
  })

  // Submission 3 (ACCEPTED)
  t = baseTime + DAY_MS
  logs.push({
    submissionId: ids.submissions[2],
    actorId: ids.author1,
    actorRole: 'author',
    action: 'status_transition',
    details: 'DRAFT → SUBMITTED',
    createdAt: t,
  })
  t = baseTime + 7 * DAY_MS
  logs.push({
    submissionId: ids.submissions[2],
    actorId: ids.eic,
    actorRole: 'editor_in_chief',
    action: 'action_editor_assigned',
    details: 'Assigned Dr. Elena Vasquez as action editor',
    createdAt: t,
  })
  t = baseTime + 8 * DAY_MS
  logs.push({
    submissionId: ids.submissions[2],
    actorId: ids.ae,
    actorRole: 'action_editor',
    action: 'reviewer_invited',
    details: 'Invited 2 reviewers',
    createdAt: t,
  })
  t = baseTime + 9 * DAY_MS
  logs.push({
    submissionId: ids.submissions[2],
    actorId: ids.reviewer1,
    actorRole: 'reviewer',
    action: 'invitation_accepted',
    createdAt: t,
  })
  t = baseTime + 9 * DAY_MS + 3_600_000
  logs.push({
    submissionId: ids.submissions[2],
    actorId: ids.reviewer2,
    actorRole: 'reviewer',
    action: 'invitation_accepted',
    createdAt: t,
  })
  t = baseTime + 28 * DAY_MS
  logs.push({
    submissionId: ids.submissions[2],
    actorId: ids.eic,
    actorRole: 'editor_in_chief',
    action: 'decision_accepted',
    createdAt: t,
  })

  // Submission 4 (REJECTED)
  t = baseTime + 2 * DAY_MS
  logs.push({
    submissionId: ids.submissions[3],
    actorId: ids.author2,
    actorRole: 'author',
    action: 'status_transition',
    details: 'DRAFT → SUBMITTED',
    createdAt: t,
  })
  t = baseTime + 7 * DAY_MS + 3_600_000
  logs.push({
    submissionId: ids.submissions[3],
    actorId: ids.eic,
    actorRole: 'editor_in_chief',
    action: 'action_editor_assigned',
    details: 'Assigned Dr. Elena Vasquez as action editor',
    createdAt: t,
  })
  t = baseTime + 8 * DAY_MS + 3_600_000
  logs.push({
    submissionId: ids.submissions[3],
    actorId: ids.ae,
    actorRole: 'action_editor',
    action: 'reviewer_invited',
    details: 'Invited 2 reviewers',
    createdAt: t,
  })
  t = baseTime + 9 * DAY_MS + 2 * 3_600_000
  logs.push({
    submissionId: ids.submissions[3],
    actorId: ids.reviewer2,
    actorRole: 'reviewer',
    action: 'invitation_accepted',
    createdAt: t,
  })
  t = baseTime + 10 * DAY_MS
  logs.push({
    submissionId: ids.submissions[3],
    actorId: ids.reviewer3,
    actorRole: 'reviewer',
    action: 'invitation_accepted',
    createdAt: t,
  })
  t = baseTime + 29 * DAY_MS
  logs.push({
    submissionId: ids.submissions[3],
    actorId: ids.eic,
    actorRole: 'editor_in_chief',
    action: 'decision_rejected',
    createdAt: t,
  })

  // Submission 5 (PUBLISHED)
  t = baseTime + 2 * DAY_MS
  logs.push({
    submissionId: ids.submissions[4],
    actorId: ids.author1,
    actorRole: 'author',
    action: 'status_transition',
    details: 'DRAFT → SUBMITTED',
    createdAt: t,
  })
  t = baseTime + 7 * DAY_MS + 2 * 3_600_000
  logs.push({
    submissionId: ids.submissions[4],
    actorId: ids.eic,
    actorRole: 'editor_in_chief',
    action: 'action_editor_assigned',
    details: 'Assigned Dr. Elena Vasquez as action editor',
    createdAt: t,
  })
  t = baseTime + 8 * DAY_MS + 2 * 3_600_000
  logs.push({
    submissionId: ids.submissions[4],
    actorId: ids.ae,
    actorRole: 'action_editor',
    action: 'reviewer_invited',
    details: 'Invited 2 reviewers',
    createdAt: t,
  })
  t = baseTime + 9 * DAY_MS + 4 * 3_600_000
  logs.push({
    submissionId: ids.submissions[4],
    actorId: ids.reviewer1,
    actorRole: 'reviewer',
    action: 'invitation_accepted',
    createdAt: t,
  })
  t = baseTime + 9 * DAY_MS + 5 * 3_600_000
  logs.push({
    submissionId: ids.submissions[4],
    actorId: ids.reviewer3,
    actorRole: 'reviewer',
    action: 'invitation_accepted',
    createdAt: t,
  })
  t = baseTime + 25 * DAY_MS
  logs.push({
    submissionId: ids.submissions[4],
    actorId: ids.reviewer1,
    actorRole: 'reviewer',
    action: 'abstract_assigned',
    details: 'Reviewer abstract assigned to Dr. Yuki Tanaka',
    createdAt: t,
  })
  t = baseTime + 30 * DAY_MS
  logs.push({
    submissionId: ids.submissions[4],
    actorId: ids.eic,
    actorRole: 'editor_in_chief',
    action: 'decision_accepted',
    createdAt: t,
  })
  t = baseTime + 33 * DAY_MS
  logs.push({
    submissionId: ids.submissions[4],
    actorId: ids.author1,
    actorRole: 'author',
    action: 'abstract_author_accepted',
    details: 'Author accepted reviewer abstract',
    createdAt: t,
  })
  t = baseTime + 35 * DAY_MS
  logs.push({
    submissionId: ids.submissions[4],
    actorId: ids.eic,
    actorRole: 'editor_in_chief',
    action: 'abstract_approved',
    details: 'Published article with reviewer abstract',
    createdAt: t,
  })

  return logs
}

function buildReviewInvites(
  baseTime: number,
  ids: {
    submissions: Array<Id<'submissions'>>
    ae: Id<'users'>
    reviewer1: Id<'users'>
    reviewer2: Id<'users'>
    reviewer3: Id<'users'>
  },
) {
  const inviteBase = baseTime + 8 * DAY_MS
  const expiryDays = 14

  return [
    // Submission 2 — reviewer 1 and 2
    {
      submissionId: ids.submissions[1],
      reviewerId: ids.reviewer1,
      reviewAssignmentId: 'seed_assignment_1',
      createdBy: ids.ae,
      tokenHash: 'seed_invite_2_1',
      expiresAt: inviteBase + expiryDays * DAY_MS,
      consumedAt: inviteBase + DAY_MS,
      createdAt: inviteBase,
    },
    {
      submissionId: ids.submissions[1],
      reviewerId: ids.reviewer2,
      reviewAssignmentId: 'seed_assignment_2',
      createdBy: ids.ae,
      tokenHash: 'seed_invite_2_2',
      expiresAt: inviteBase + expiryDays * DAY_MS,
      consumedAt: inviteBase + DAY_MS,
      createdAt: inviteBase,
    },
    // Submission 3 — reviewer 1 and 2
    {
      submissionId: ids.submissions[2],
      reviewerId: ids.reviewer1,
      reviewAssignmentId: 'seed_assignment_3',
      createdBy: ids.ae,
      tokenHash: 'seed_invite_3_1',
      expiresAt: inviteBase + expiryDays * DAY_MS,
      consumedAt: inviteBase + DAY_MS,
      createdAt: inviteBase,
    },
    {
      submissionId: ids.submissions[2],
      reviewerId: ids.reviewer2,
      reviewAssignmentId: 'seed_assignment_4',
      createdBy: ids.ae,
      tokenHash: 'seed_invite_3_2',
      expiresAt: inviteBase + expiryDays * DAY_MS,
      consumedAt: inviteBase + DAY_MS + 3_600_000,
      createdAt: inviteBase,
    },
    // Submission 4 — reviewer 2 and 3
    {
      submissionId: ids.submissions[3],
      reviewerId: ids.reviewer2,
      reviewAssignmentId: 'seed_assignment_5',
      createdBy: ids.ae,
      tokenHash: 'seed_invite_4_2',
      expiresAt: inviteBase + expiryDays * DAY_MS,
      consumedAt: inviteBase + DAY_MS + 2 * 3_600_000,
      createdAt: inviteBase + 3_600_000,
    },
    {
      submissionId: ids.submissions[3],
      reviewerId: ids.reviewer3,
      reviewAssignmentId: 'seed_assignment_6',
      createdBy: ids.ae,
      tokenHash: 'seed_invite_4_3',
      expiresAt: inviteBase + expiryDays * DAY_MS,
      consumedAt: inviteBase + 2 * DAY_MS,
      createdAt: inviteBase + 3_600_000,
    },
    // Submission 5 — reviewer 1 and 3
    {
      submissionId: ids.submissions[4],
      reviewerId: ids.reviewer1,
      reviewAssignmentId: 'seed_assignment_7',
      createdBy: ids.ae,
      tokenHash: 'seed_invite_5_1',
      expiresAt: inviteBase + expiryDays * DAY_MS,
      consumedAt: inviteBase + DAY_MS + 4 * 3_600_000,
      createdAt: inviteBase + 2 * 3_600_000,
    },
    {
      submissionId: ids.submissions[4],
      reviewerId: ids.reviewer3,
      reviewAssignmentId: 'seed_assignment_8',
      createdBy: ids.ae,
      tokenHash: 'seed_invite_5_3',
      expiresAt: inviteBase + expiryDays * DAY_MS,
      consumedAt: inviteBase + DAY_MS + 5 * 3_600_000,
      createdAt: inviteBase + 2 * 3_600_000,
    },
  ]
}

function buildMatchResults(
  baseTime: number,
  ids: {
    submission2: Id<'submissions'>
    profiles: Array<Id<'reviewerProfiles'>>
    reviewers: Array<Id<'users'>>
  },
) {
  return [
    {
      submissionId: ids.submission2,
      status: 'complete' as const,
      matches: [
        {
          profileId: ids.profiles[2],
          userId: ids.reviewers[2],
          reviewerName: 'Dr. James Mitchell',
          affiliation: 'DeepMind',
          researchAreas: [
            'mechanistic interpretability',
            'circuit analysis',
            'transformer internals',
          ],
          publicationTitles: [
            'Identifying Safety-Critical Circuits in Language Models via Causal Tracing',
          ],
          tier: 'great' as const,
          score: 92,
          strengths: [
            'Mechanistic interpretability expertise directly applicable to detecting mesa-optimization signatures in transformers.',
            'Published on safety-critical circuit identification using causal tracing — core methodology of this paper.',
          ],
          gapAnalysis: 'Less focused on inner alignment theory; may need to pair with a reviewer stronger in formal mesa-optimization definitions.',
          recommendations: [
            'Pair with a reviewer who has formal inner alignment expertise for comprehensive coverage.',
          ],
        },
        {
          profileId: ids.profiles[0],
          userId: ids.reviewers[0],
          reviewerName: 'Dr. Yuki Tanaka',
          affiliation: 'MIRI',
          researchAreas: [
            'corrigibility',
            'agent foundations',
            'decision theory',
          ],
          publicationTitles: [
            'Toward a Formal Theory of Corrigible Agent Architectures',
          ],
          tier: 'great' as const,
          score: 87,
          strengths: [
            'Strong background in agent foundations and formal alignment theory.',
            'Research on corrigibility directly relevant to mesa-optimization analysis.',
          ],
          gapAnalysis: 'Primary expertise is in corrigibility rather than mesa-optimization specifically, but strong theoretical foundations compensate.',
          recommendations: [
            'Well-suited for evaluating the formal framework and theoretical contributions.',
          ],
        },
        {
          profileId: ids.profiles[1],
          userId: ids.reviewers[1],
          reviewerName: 'Dr. Priya Sharma',
          affiliation: 'Anthropic',
          researchAreas: [
            'scalable oversight',
            'reward modeling',
            'RLHF',
          ],
          publicationTitles: [
            'Recursive Reward Calibration for Complex Tasks',
          ],
          tier: 'good' as const,
          score: 68,
          strengths: [
            'Expertise in training dynamics and reward modeling relevant to understanding mesa-optimizer emergence during RLHF.',
            'Experience with evaluation methodology applicable to assessing the proposed mitigation strategies.',
          ],
          gapAnalysis: 'Primary focus on scalable oversight rather than inner alignment. May not be able to fully evaluate the mechanistic interpretability components.',
          recommendations: [
            'Best suited for evaluating the RLHF-related aspects and proposed adversarial training mitigation.',
          ],
        },
      ],
      editorialNotes: [
        'Dr. Mitchell and Dr. Tanaka form a strong complementary pair: Mitchell covers the mechanistic interpretability methodology while Tanaka brings formal alignment theory.',
        'Dr. Sharma adds RLHF training dynamics perspective but is currently unavailable.',
        'Recommended combination: Mitchell + Tanaka for comprehensive coverage of both empirical and theoretical aspects.',
      ],
      suggestedCombination: [1, 2],
      modelVersion: 'claude-haiku-4-5-20251001',
      computedAt: baseTime + 7 * DAY_MS,
      createdAt: baseTime + 7 * DAY_MS,
    },
  ]
}

function buildNotifications(
  baseTime: number,
  ids: {
    submissions: Array<Id<'submissions'>>
    author1: Id<'users'>
    author2: Id<'users'>
    reviewer1: Id<'users'>
    reviewer2: Id<'users'>
    reviewer3: Id<'users'>
  },
) {
  return [
    // Review invitations
    {
      recipientId: ids.reviewer1,
      submissionId: ids.submissions[1],
      type: 'review_invitation',
      subject: 'Review Invitation',
      body: 'You have been invited to review a submission on mesa-optimization in transformers.',
      createdAt: baseTime + 8 * DAY_MS,
    },
    {
      recipientId: ids.reviewer2,
      submissionId: ids.submissions[1],
      type: 'review_invitation',
      subject: 'Review Invitation',
      body: 'You have been invited to review a submission on mesa-optimization in transformers.',
      createdAt: baseTime + 8 * DAY_MS,
    },
    // Decision notifications
    {
      recipientId: ids.author1,
      submissionId: ids.submissions[2],
      type: 'decision',
      subject: 'Editorial Decision: Accepted',
      body: 'Your submission "Scalable Oversight via Recursive Reward Modeling with Human Feedback" has been accepted for publication.',
      readAt: baseTime + 28 * DAY_MS + 3_600_000,
      createdAt: baseTime + 28 * DAY_MS,
    },
    {
      recipientId: ids.author2,
      submissionId: ids.submissions[3],
      type: 'decision',
      subject: 'Editorial Decision: Rejected',
      body: "Your submission \"Utility Functions and Goodhart's Law: Pathological Optimization in Reward Models\" has been rejected. Please see the editorial decision note for details.",
      createdAt: baseTime + 29 * DAY_MS,
    },
    {
      recipientId: ids.author1,
      submissionId: ids.submissions[4],
      type: 'publication',
      subject: 'Article Published',
      body: 'Your article "Mechanistic Interpretability of Alignment-Relevant Circuits in Large Language Models" has been published.',
      readAt: baseTime + 35 * DAY_MS + 3_600_000,
      createdAt: baseTime + 35 * DAY_MS,
    },
  ]
}

function buildPayments(
  baseTime: number,
  ids: {
    submissions: Array<Id<'submissions'>>
    reviewer1: Id<'users'>
    reviewer2: Id<'users'>
    reviewer3: Id<'users'>
  },
) {
  const payBase = baseTime + 20 * DAY_MS
  return [
    // Submission 3 payments
    {
      submissionId: ids.submissions[2],
      reviewerId: ids.reviewer1,
      qualityLevel: 'excellent' as const,
      createdAt: payBase,
      updatedAt: payBase,
    },
    {
      submissionId: ids.submissions[2],
      reviewerId: ids.reviewer2,
      qualityLevel: 'useful' as const,
      createdAt: payBase,
      updatedAt: payBase,
    },
    // Submission 4 payments
    {
      submissionId: ids.submissions[3],
      reviewerId: ids.reviewer2,
      qualityLevel: 'useful' as const,
      createdAt: payBase + DAY_MS,
      updatedAt: payBase + DAY_MS,
    },
    {
      submissionId: ids.submissions[3],
      reviewerId: ids.reviewer3,
      qualityLevel: 'useful' as const,
      createdAt: payBase + DAY_MS,
      updatedAt: payBase + DAY_MS,
    },
    // Submission 5 payments
    {
      submissionId: ids.submissions[4],
      reviewerId: ids.reviewer1,
      qualityLevel: 'excellent' as const,
      createdAt: payBase + 2 * DAY_MS,
      updatedAt: payBase + 2 * DAY_MS,
    },
    {
      submissionId: ids.submissions[4],
      reviewerId: ids.reviewer3,
      qualityLevel: 'excellent' as const,
      createdAt: payBase + 2 * DAY_MS,
      updatedAt: payBase + 2 * DAY_MS,
    },
  ]
}

// ---------------------------------------------------------------------------
// Idempotency check
// ---------------------------------------------------------------------------

/**
 * Returns 'complete' if fully seeded, 'partial' if sentinel user exists
 * but final data (match results referencing seed submissions) is missing,
 * or 'none' if no seed data exists.
 */
export const checkSeeded = internalQuery({
  args: {},
  returns: v.union(
    v.literal('complete'),
    v.literal('partial'),
    v.literal('none'),
  ),
  handler: async (ctx) => {
    const sentinel = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', SENTINEL_CLERK_ID))
      .unique()
    if (!sentinel) return 'none'
    // Check that match results exist (seeded last) to confirm full completion
    const matchResult = await ctx.db.query('matchResults').first()
    return matchResult ? 'complete' : 'partial'
  },
})

/** Delete all seed data (users with seed_ prefix and their related records). */
export const cleanupPartialSeed = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Find all seed users by clerkId prefix
    const allUsers = await ctx.db.query('users').collect()
    const seedUsers = allUsers.filter((u) => u.clerkId.startsWith('seed_'))
    const seedUserIds = new Set(seedUsers.map((u) => u._id))

    // Delete seed users
    for (const user of seedUsers) {
      await ctx.db.delete('users', user._id)
    }

    // Delete submissions by seed authors (clean up stored PDFs first)
    const submissions = await ctx.db.query('submissions').collect()
    const seedSubmissions = submissions.filter((s) =>
      seedUserIds.has(s.authorId),
    )
    const seedSubmissionIds = new Set(seedSubmissions.map((s) => s._id))
    for (const sub of seedSubmissions) {
      if (sub.pdfStorageId) {
        await ctx.storage.delete(sub.pdfStorageId)
      }
      await ctx.db.delete('submissions', sub._id)
    }

    // Delete records referencing seed submissions (explicit table names for lint compliance)
    async function deleteBySubmissionId<
      T extends
        | 'triageReports'
        | 'reviews'
        | 'reviewerAbstracts'
        | 'discussions'
        | 'auditLogs'
        | 'notifications'
        | 'payments'
        | 'reviewInvites'
        | 'matchResults',
    >(table: T) {
      const records = await ctx.db.query(table).collect()
      for (const record of records) {
        if (
          'submissionId' in record &&
          seedSubmissionIds.has(record.submissionId as Id<'submissions'>)
        ) {
          await ctx.db.delete(table, record._id)
        }
      }
    }

    await deleteBySubmissionId('triageReports')
    await deleteBySubmissionId('reviews')
    await deleteBySubmissionId('reviewerAbstracts')
    await deleteBySubmissionId('discussions')
    await deleteBySubmissionId('auditLogs')
    await deleteBySubmissionId('notifications')
    await deleteBySubmissionId('payments')
    await deleteBySubmissionId('reviewInvites')
    await deleteBySubmissionId('matchResults')

    // Delete reviewer profiles for seed users
    const profiles = await ctx.db.query('reviewerProfiles').collect()
    for (const profile of profiles) {
      if (seedUserIds.has(profile.userId)) {
        await ctx.db.delete('reviewerProfiles', profile._id)
      }
    }

    return null
  },
})

// ---------------------------------------------------------------------------
// Batch insert mutations (one per table)
// ---------------------------------------------------------------------------

export const patchSubmissionPdf = internalMutation({
  args: {
    submissionId: v.id('submissions'),
    pdfStorageId: v.id('_storage'),
    pdfFileName: v.string(),
    pdfFileSize: v.number(),
    pageCount: v.number(),
    extractedText: v.string(),
    extractedHtml: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      pdfStorageId: args.pdfStorageId,
      pdfFileName: args.pdfFileName,
      pdfFileSize: args.pdfFileSize,
      pageCount: args.pageCount,
      extractedText: args.extractedText,
    }
    if (args.extractedHtml !== undefined) {
      patch.extractedHtml = args.extractedHtml
    }
    await ctx.db.patch('submissions', args.submissionId, patch)
    return null
  },
})

const roleValidator = v.union(
  v.literal('author'),
  v.literal('reviewer'),
  v.literal('action_editor'),
  v.literal('editor_in_chief'),
  v.literal('admin'),
)

export const seedUsers = internalMutation({
  args: {
    records: v.array(
      v.object({
        clerkId: v.string(),
        email: v.string(),
        name: v.string(),
        affiliation: v.string(),
        role: roleValidator,
        createdAt: v.number(),
      }),
    ),
  },
  returns: v.array(v.id('users')),
  handler: async (ctx, { records }) => {
    const ids: Array<Id<'users'>> = []
    for (const record of records) {
      ids.push(await ctx.db.insert('users', record))
    }
    return ids
  },
})

export const seedSubmissions = internalMutation({
  args: {
    records: v.array(
      v.object({
        authorId: v.id('users'),
        title: v.string(),
        authors: v.array(
          v.object({ name: v.string(), affiliation: v.string() }),
        ),
        abstract: v.string(),
        keywords: v.array(v.string()),
        status: submissionStatusValidator,
        actionEditorId: v.optional(v.id('users')),
        assignedAt: v.optional(v.number()),
        decisionNote: v.optional(v.string()),
        decidedAt: v.optional(v.number()),
        extractedText: v.optional(v.string()),
        pageCount: v.optional(v.number()),
        shortId: v.optional(v.string()),
        publicConversation: v.optional(v.boolean()),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  returns: v.array(v.id('submissions')),
  handler: async (ctx, { records }) => {
    const ids: Array<Id<'submissions'>> = []
    for (const record of records) {
      ids.push(await ctx.db.insert('submissions', record))
    }
    return ids
  },
})

export const seedTriageReports = internalMutation({
  args: {
    records: v.array(
      v.object({
        submissionId: v.id('submissions'),
        triageRunId: v.string(),
        passName: v.union(
          v.literal('scope'),
          v.literal('formatting'),
          v.literal('citations'),
          v.literal('claims'),
        ),
        status: v.union(
          v.literal('pending'),
          v.literal('running'),
          v.literal('complete'),
          v.literal('failed'),
        ),
        idempotencyKey: v.string(),
        attemptCount: v.number(),
        result: v.optional(
          v.object({
            finding: v.string(),
            severity: v.union(
              v.literal('low'),
              v.literal('medium'),
              v.literal('high'),
            ),
            recommendation: v.string(),
          }),
        ),
        lastError: v.optional(v.string()),
        completedAt: v.optional(v.number()),
        createdAt: v.number(),
      }),
    ),
  },
  returns: v.array(v.id('triageReports')),
  handler: async (ctx, { records }) => {
    const ids: Array<Id<'triageReports'>> = []
    for (const record of records) {
      ids.push(await ctx.db.insert('triageReports', record))
    }
    return ids
  },
})

export const seedReviewerProfiles = internalMutation({
  args: {
    records: v.array(
      v.object({
        userId: v.id('users'),
        researchAreas: v.array(v.string()),
        publications: v.array(
          v.object({
            title: v.string(),
            venue: v.string(),
            year: v.number(),
          }),
        ),
        expertiseLevels: v.optional(
          v.array(
            v.object({
              area: v.string(),
              level: v.union(
                v.literal('primary'),
                v.literal('secondary'),
                v.literal('familiar'),
              ),
            }),
          ),
        ),
        education: v.optional(
          v.array(
            v.object({
              institution: v.string(),
              degree: v.string(),
              field: v.string(),
              yearCompleted: v.optional(v.number()),
            }),
          ),
        ),
        bio: v.optional(v.string()),
        preferredTopics: v.optional(v.array(v.string())),
        isAvailable: v.optional(v.boolean()),
        maxConcurrentReviews: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  returns: v.array(v.id('reviewerProfiles')),
  handler: async (ctx, { records }) => {
    const ids: Array<Id<'reviewerProfiles'>> = []
    for (const record of records) {
      ids.push(await ctx.db.insert('reviewerProfiles', record))
    }
    return ids
  },
})

export const seedReviews = internalMutation({
  args: {
    records: v.array(
      v.object({
        submissionId: v.id('submissions'),
        reviewerId: v.id('users'),
        sections: v.object({
          summary: v.optional(v.string()),
          strengths: v.optional(v.string()),
          weaknesses: v.optional(v.string()),
          questions: v.optional(v.string()),
          recommendation: v.optional(v.string()),
        }),
        status: v.union(
          v.literal('assigned'),
          v.literal('in_progress'),
          v.literal('submitted'),
          v.literal('locked'),
        ),
        revision: v.number(),
        submittedAt: v.optional(v.number()),
        lockedAt: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  returns: v.array(v.id('reviews')),
  handler: async (ctx, { records }) => {
    const ids: Array<Id<'reviews'>> = []
    for (const record of records) {
      ids.push(await ctx.db.insert('reviews', record))
    }
    return ids
  },
})

export const seedReviewerAbstracts = internalMutation({
  args: {
    records: v.array(
      v.object({
        submissionId: v.id('submissions'),
        reviewerId: v.id('users'),
        content: v.string(),
        wordCount: v.number(),
        isSigned: v.boolean(),
        status: v.union(
          v.literal('drafting'),
          v.literal('submitted'),
          v.literal('approved'),
        ),
        authorAccepted: v.optional(v.boolean()),
        authorAcceptedAt: v.optional(v.number()),
        revision: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  returns: v.array(v.id('reviewerAbstracts')),
  handler: async (ctx, { records }) => {
    const ids: Array<Id<'reviewerAbstracts'>> = []
    for (const record of records) {
      ids.push(await ctx.db.insert('reviewerAbstracts', record))
    }
    return ids
  },
})

export const seedDiscussions = internalMutation({
  args: {
    records: v.array(
      v.object({
        submissionId: v.id('submissions'),
        authorId: v.id('users'),
        parentId: v.optional(v.id('discussions')),
        content: v.string(),
        isRetracted: v.boolean(),
        editableUntil: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  returns: v.array(v.id('discussions')),
  handler: async (ctx, { records }) => {
    const ids: Array<Id<'discussions'>> = []
    for (const record of records) {
      ids.push(await ctx.db.insert('discussions', record))
    }
    return ids
  },
})

export const seedAuditLogs = internalMutation({
  args: {
    records: v.array(
      v.object({
        submissionId: v.id('submissions'),
        actorId: v.id('users'),
        actorRole: v.string(),
        action: v.string(),
        details: v.optional(v.string()),
        createdAt: v.number(),
      }),
    ),
  },
  returns: v.array(v.id('auditLogs')),
  handler: async (ctx, { records }) => {
    const ids: Array<Id<'auditLogs'>> = []
    for (const record of records) {
      ids.push(await ctx.db.insert('auditLogs', record))
    }
    return ids
  },
})

export const seedNotifications = internalMutation({
  args: {
    records: v.array(
      v.object({
        recipientId: v.id('users'),
        submissionId: v.optional(v.id('submissions')),
        type: v.string(),
        subject: v.string(),
        body: v.string(),
        readAt: v.optional(v.number()),
        createdAt: v.number(),
      }),
    ),
  },
  returns: v.array(v.id('notifications')),
  handler: async (ctx, { records }) => {
    const ids: Array<Id<'notifications'>> = []
    for (const record of records) {
      ids.push(await ctx.db.insert('notifications', record))
    }
    return ids
  },
})

export const seedPayments = internalMutation({
  args: {
    records: v.array(
      v.object({
        submissionId: v.id('submissions'),
        reviewerId: v.id('users'),
        qualityLevel: v.union(v.literal('useful'), v.literal('excellent')),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  returns: v.array(v.id('payments')),
  handler: async (ctx, { records }) => {
    const ids: Array<Id<'payments'>> = []
    for (const record of records) {
      ids.push(await ctx.db.insert('payments', record))
    }
    return ids
  },
})

export const seedReviewInvites = internalMutation({
  args: {
    records: v.array(
      v.object({
        submissionId: v.id('submissions'),
        reviewerId: v.id('users'),
        reviewAssignmentId: v.string(),
        createdBy: v.id('users'),
        tokenHash: v.string(),
        expiresAt: v.number(),
        consumedAt: v.optional(v.number()),
        revokedAt: v.optional(v.number()),
        createdAt: v.number(),
      }),
    ),
  },
  returns: v.array(v.id('reviewInvites')),
  handler: async (ctx, { records }) => {
    const ids: Array<Id<'reviewInvites'>> = []
    for (const record of records) {
      ids.push(await ctx.db.insert('reviewInvites', record))
    }
    return ids
  },
})

export const seedMatchResults = internalMutation({
  args: {
    records: v.array(
      v.object({
        submissionId: v.id('submissions'),
        status: v.union(
          v.literal('pending'),
          v.literal('running'),
          v.literal('complete'),
          v.literal('failed'),
        ),
        matches: v.array(
          v.object({
            profileId: v.id('reviewerProfiles'),
            userId: v.id('users'),
            reviewerName: v.string(),
            affiliation: v.string(),
            researchAreas: v.array(v.string()),
            publicationTitles: v.array(v.string()),
            tier: v.union(
              v.literal('great'),
              v.literal('good'),
              v.literal('exploring'),
            ),
            score: v.float64(),
            strengths: v.array(v.string()),
            gapAnalysis: v.string(),
            recommendations: v.array(v.string()),
          }),
        ),
        editorialNotes: v.optional(v.array(v.string())),
        suggestedCombination: v.optional(v.array(v.number())),
        modelVersion: v.optional(v.string()),
        computedAt: v.optional(v.number()),
        error: v.optional(v.string()),
        createdAt: v.number(),
      }),
    ),
  },
  returns: v.array(v.id('matchResults')),
  handler: async (ctx, { records }) => {
    const ids: Array<Id<'matchResults'>> = []
    for (const record of records) {
      ids.push(await ctx.db.insert('matchResults', record))
    }
    return ids
  },
})

// ---------------------------------------------------------------------------
// Main seed Action
// ---------------------------------------------------------------------------

export const seedData = internalAction({
  args: {},
  returns: v.union(
    v.object({ alreadySeeded: v.literal(true) }),
    v.object({
      alreadySeeded: v.literal(false),
      users: v.number(),
      submissions: v.number(),
      pdfs: v.number(),
      triageReports: v.number(),
      reviewerProfiles: v.number(),
      reviews: v.number(),
      reviewerAbstracts: v.number(),
      discussions: v.number(),
      auditLogs: v.number(),
      notifications: v.number(),
      payments: v.number(),
      reviewInvites: v.number(),
      matchResults: v.number(),
    }),
  ),
  handler: async (ctx) => {
    // Idempotency check — detects both complete and partial seed states
    const seedStatus = await ctx.runQuery(internal.seed.checkSeeded)
    if (seedStatus === 'complete') {
      return { alreadySeeded: true as const }
    }
    // Clean up partial seed data from a previous failed run
    if (seedStatus === 'partial') {
      await ctx.runMutation(internal.seed.cleanupPartialSeed)
    }

    // Base time: 60 days ago
    const baseTime = Date.now() - 60 * DAY_MS

    // 1. Users
    const usersData = buildSeedUsers(baseTime)
    const userIds: Array<Id<'users'>> = await ctx.runMutation(
      internal.seed.seedUsers,
      { records: usersData },
    )
    const uids = {
      author1: userIds[0],
      author2: userIds[1],
      reviewer1: userIds[2],
      reviewer2: userIds[3],
      reviewer3: userIds[4],
      ae: userIds[5],
      eic: userIds[6],
      admin: userIds[7],
      reviewer4: userIds[8],
      reviewer5: userIds[9],
    }

    // 2. Submissions
    const submissionsData = buildSubmissions(baseTime, {
      author1: uids.author1,
      author2: uids.author2,
      ae: uids.ae,
    })
    const submissionIds: Array<Id<'submissions'>> = await ctx.runMutation(
      internal.seed.seedSubmissions,
      { records: submissionsData },
    )

    // 2a. Fetch arXiv PDFs, store in Convex, extract text, patch submissions
    const pdfEntries = ARXIV_PAPERS.map((paper, i) => ({
      submissionId: submissionIds[i],
      arxivId: paper.arxivId,
      fileName: paper.fileName,
    }))
    const pdfCount: number = await ctx.runAction(
      internal.seedPdfActions.uploadArxivPdfs,
      { entries: pdfEntries },
    )

    // 3. Triage reports (all 5 submissions)
    const triageData = buildTriageReports(baseTime, submissionIds)
    const triageIds: Array<Id<'triageReports'>> = await ctx.runMutation(
      internal.seed.seedTriageReports,
      { records: triageData },
    )

    // 4. Reviewer profiles
    const profilesData = buildReviewerProfiles(baseTime, [
      uids.reviewer1,
      uids.reviewer2,
      uids.reviewer3,
      uids.reviewer4,
      uids.reviewer5,
    ])
    const profileIds: Array<Id<'reviewerProfiles'>> = await ctx.runMutation(
      internal.seed.seedReviewerProfiles,
      { records: profilesData },
    )

    // 5. Reviews
    const reviewsData = buildReviews(baseTime, {
      submissions: submissionIds,
      reviewers: [uids.reviewer1, uids.reviewer2, uids.reviewer3],
    })
    const reviewIds: Array<Id<'reviews'>> = await ctx.runMutation(
      internal.seed.seedReviews,
      { records: reviewsData },
    )

    // 6. Reviewer abstract (Submission 5)
    const abstractsData = buildReviewerAbstract(baseTime, {
      submission5: submissionIds[4],
      reviewer1: uids.reviewer1,
    })
    const abstractIds: Array<Id<'reviewerAbstracts'>> = await ctx.runMutation(
      internal.seed.seedReviewerAbstracts,
      { records: abstractsData },
    )

    // 7. Discussions (Submission 3 and 5 — top-level messages)
    const discussionsData = buildDiscussions(baseTime, {
      submission3: submissionIds[2],
      submission5: submissionIds[4],
      author1: uids.author1,
      reviewer1: uids.reviewer1,
      reviewer2: uids.reviewer2,
      reviewer3: uids.reviewer3,
    })
    const discussionIds: Array<Id<'discussions'>> = await ctx.runMutation(
      internal.seed.seedDiscussions,
      { records: discussionsData },
    )

    // 7a. Discussion replies (need parent IDs from step 7)
    // Submission 5 discussions start at index 4 (after 4 Submission 3 messages).
    // Validate the index exists to prevent silent degradation if ordering changes.
    const SUB5_FIRST_DISCUSSION_INDEX = 4
    if (
      SUB5_FIRST_DISCUSSION_INDEX >= discussionIds.length ||
      !discussionIds[SUB5_FIRST_DISCUSSION_INDEX]
    ) {
      throw new Error(
        `Expected discussion at index ${SUB5_FIRST_DISCUSSION_INDEX} for Submission 5 threaded reply, but only ${discussionIds.length} discussions were created`,
      )
    }
    const repliesData = buildDiscussionReplies(baseTime, {
      submission5: submissionIds[4],
      author1: uids.author1,
      sub5FirstDiscussionId: discussionIds[SUB5_FIRST_DISCUSSION_INDEX],
    })
    const replyIds: Array<Id<'discussions'>> = await ctx.runMutation(
      internal.seed.seedDiscussions,
      { records: repliesData },
    )

    // 8. Audit logs
    const auditData = buildAuditLogs(baseTime, {
      submissions: submissionIds,
      author1: uids.author1,
      author2: uids.author2,
      eic: uids.eic,
      ae: uids.ae,
      reviewer1: uids.reviewer1,
      reviewer2: uids.reviewer2,
      reviewer3: uids.reviewer3,
    })
    const auditIds: Array<Id<'auditLogs'>> = await ctx.runMutation(
      internal.seed.seedAuditLogs,
      { records: auditData },
    )

    // 9. Notifications
    const notificationsData = buildNotifications(baseTime, {
      submissions: submissionIds,
      author1: uids.author1,
      author2: uids.author2,
      reviewer1: uids.reviewer1,
      reviewer2: uids.reviewer2,
      reviewer3: uids.reviewer3,
    })
    const notificationIds: Array<Id<'notifications'>> = await ctx.runMutation(
      internal.seed.seedNotifications,
      { records: notificationsData },
    )

    // 10. Payments
    const paymentsData = buildPayments(baseTime, {
      submissions: submissionIds,
      reviewer1: uids.reviewer1,
      reviewer2: uids.reviewer2,
      reviewer3: uids.reviewer3,
    })
    const paymentIds: Array<Id<'payments'>> = await ctx.runMutation(
      internal.seed.seedPayments,
      { records: paymentsData },
    )

    // 11. Review invites
    const invitesData = buildReviewInvites(baseTime, {
      submissions: submissionIds,
      ae: uids.ae,
      reviewer1: uids.reviewer1,
      reviewer2: uids.reviewer2,
      reviewer3: uids.reviewer3,
    })
    const inviteIds: Array<Id<'reviewInvites'>> = await ctx.runMutation(
      internal.seed.seedReviewInvites,
      { records: invitesData },
    )

    // 12. Match results (Submission 2)
    const matchData = buildMatchResults(baseTime, {
      submission2: submissionIds[1],
      profiles: profileIds,
      reviewers: [uids.reviewer1, uids.reviewer2, uids.reviewer3],
    })
    const matchIds: Array<Id<'matchResults'>> = await ctx.runMutation(
      internal.seed.seedMatchResults,
      { records: matchData },
    )

    return {
      alreadySeeded: false as const,
      users: userIds.length,
      submissions: submissionIds.length,
      pdfs: pdfCount,
      triageReports: triageIds.length,
      reviewerProfiles: profileIds.length,
      reviews: reviewIds.length,
      reviewerAbstracts: abstractIds.length,
      discussions: discussionIds.length + replyIds.length,
      auditLogs: auditIds.length,
      notifications: notificationIds.length,
      payments: paymentIds.length,
      reviewInvites: inviteIds.length,
      matchResults: matchIds.length,
    }
  },
})

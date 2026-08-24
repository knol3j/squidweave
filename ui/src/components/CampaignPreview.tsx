import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Globe2,
  Inbox,
  Radar,
  Sparkles,
  Target,
  WandSparkles,
  AlertTriangle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useCollaboration } from './CollaborationProvider';
import {
  type ActivationRun,
  ApiError,
  dataService,
  type FundingOutreachEvent,
  type FundingPipeline,
  type FundingRun,
  type FundingInvestor,
  type ProspectPipeline,
  type ProspectingPlan,
  type ProspectingRun,
  type ResearchRecord,
  type SourcedContact,
} from '../services/dataService';
import { AGENT_SYSTEM } from '../lib/agentSystem';
import ClientIntakeForm from './campaign/ClientIntakeForm';
import AgentModuleGrid from './campaign/AgentModuleGrid';
import ResearchIntakeForm from './campaign/ResearchIntakeForm';
import ProspectingEngine from './campaign/ProspectingEngine';
import FundingImportPanel from './campaign/FundingImportPanel';

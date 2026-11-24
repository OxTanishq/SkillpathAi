import '@xyflow/react/dist/style.css';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  List,
  Lock,
  Maximize2,
  Minimize2,
  Network,
  PlayCircle,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { VERIFIED_RESOURCES } from '../data/catalog.ts';
import type { RoadmapData, SkillNodeData, SkillNodeStatus } from '../types/domain.ts';

interface SkillNodeFlowData extends Record<string, unknown> {
  skill: SkillNodeData;
  isSelected: boolean;
  isHighlighted: boolean;
}

const STATUS_META: Record<
  SkillNodeStatus,
  { label: string; border: string; badge: string; icon: React.ReactNode }
> = {
  completed: {
    label: 'Completed',
    border: 'border-emerald-500/60 bg-emerald-500/[0.08]',
    badge: 'text-emerald-600 dark:text-emerald-400',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />,
  },
  in_progress: {
    label: 'In progress',
    border: 'border-[#8B5CF6] bg-[#8B5CF6]/12 shadow-[0_0_24px_rgba(139,92,246,0.18)]',
    badge: 'text-[#7C3AED] dark:text-[#C4B5FD]',
    icon: <PlayCircle className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />,
  },
  available: {
    label: 'Available',
    border: 'border-[#38BDF8]/60 bg-[#38BDF8]/[0.07]',
    badge: 'text-sky-700 dark:text-[#38BDF8]',
    icon: <Circle className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />,
  },
  optional_milestone: {
    label: 'Optional milestone',
    border: 'border-dashed border-amber-500/60 bg-amber-500/[0.07]',
    badge: 'text-amber-700 dark:text-amber-300',
    icon: <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
  },
  not_started: {
    label: 'Needs prerequisites',
    border: 'border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#101018]/90 opacity-75',
    badge: 'text-slate-500 dark:text-zinc-500',
    icon: <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0" />,
  },
};

const SkillTreeCustomNode: React.FC<NodeProps<Node<SkillNodeFlowData>>> = ({ data }) => {
  const { skill, isSelected, isHighlighted } = data;
  const meta = STATUS_META[skill.status];

  return (
    <div
      className={`w-[244px] rounded-xl border px-3.5 py-3 text-left transition-all ${meta.border} ${
        isSelected ? 'ring-2 ring-[#8B5CF6] ring-offset-2 ring-offset-[#050507]' : ''
      } ${isHighlighted ? 'ring-2 ring-[#38BDF8]' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-[#8B5CF6] !border-0" />
      <div className="flex items-center justify-between gap-2 text-[11px] font-medium">
        <span className={`inline-flex items-center gap-1.5 ${meta.badge}`}>
          {meta.icon}
          <span>{meta.label}</span>
        </span>
        <span className="font-mono text-[11px] text-slate-500 dark:text-zinc-400 tabular-nums">
          {skill.estimatedHours}h
        </span>
      </div>
      <div className="mt-1.5 font-display text-sm font-semibold text-slate-900 dark:text-slate-50 leading-snug">
        {skill.title}
      </div>
      <div className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400 truncate">
        Stage {skill.stageNumber} · {skill.stageTitle}
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-[#38BDF8] !border-0" />
    </div>
  );
};

const nodeTypes = { skillNode: SkillTreeCustomNode };

interface SkillTreeGraphProps {
  roadmap: RoadmapData;
  onUpdateSkillStatus: (skillId: string, status: SkillNodeStatus) => Promise<void>;
  onAskMentorAboutSkill: (skill: SkillNodeData) => void;
}

const SkillTreeInner: React.FC<SkillTreeGraphProps> = ({
  roadmap,
  onUpdateSkillStatus,
  onAskMentorAboutSkill,
}) => {
  const { fitView, setCenter } = useReactFlow();
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const allSkills = useMemo(() => roadmap.stages.flatMap((s) => s.skills), [roadmap]);
  const skillMap = useMemo(() => new Map(allSkills.map((s) => [s.id, s])), [allSkills]);

  const matchedIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return new Set<string>();
    return new Set(
      allSkills
        .filter((s) => s.title.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q))
        .map((s) => s.id)
    );
  }, [allSkills, searchQuery]);

  const layoutData = useMemo(() => {
    const nodes: Node<SkillNodeFlowData>[] = [];
    const edges: Edge[] = [];
    const colWidth = 320;
    const rowHeight = 148;

    roadmap.stages.forEach((stage, stageIdx) => {
      const count = stage.skills.length;
      const startY = -((count - 1) * rowHeight) / 2;
      stage.skills.forEach((skill, idx) => {
        nodes.push({
          id: skill.id,
          type: 'skillNode',
          position: { x: stageIdx * colWidth, y: startY + idx * rowHeight },
          data: {
            skill,
            isSelected: selectedSkillId === skill.id,
            isHighlighted: matchedIds.has(skill.id),
          },
        });

        for (const prereqId of skill.prerequisites) {
          if (!skillMap.has(prereqId)) continue;
          const isActiveEdge = skill.status === 'in_progress' || skill.status === 'available';
          const isDoneEdge = skill.status === 'completed';
          edges.push({
            id: `${prereqId}->${skill.id}`,
            source: prereqId,
            target: skill.id,
            animated: isActiveEdge,
            style: {
              stroke: isDoneEdge ? '#34D399' : isActiveEdge ? '#8B5CF6' : '#52525B',
              strokeWidth: isActiveEdge ? 2 : 1.4,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isDoneEdge ? '#34D399' : isActiveEdge ? '#8B5CF6' : '#52525B',
            },
          });
        }
      });
    });

    return { nodes, edges };
  }, [roadmap, selectedSkillId, matchedIds, skillMap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutData.edges);

  useEffect(() => {
    setNodes(layoutData.nodes);
    setEdges(layoutData.edges);
  }, [layoutData, setNodes, setEdges]);

  const handleSearchFocus = useCallback(() => {
    const firstMatchId = Array.from(matchedIds)[0];
    if (!firstMatchId) return;
    const targetNode = nodes.find((n) => n.id === firstMatchId);
    if (targetNode) {
      setCenter(targetNode.position.x + 120, targetNode.position.y + 45, {
        zoom: 1.05,
        duration: 450,
      });
      setSelectedSkillId(firstMatchId);
    }
  }, [matchedIds, nodes, setCenter]);

  const selectedSkill = selectedSkillId ? skillMap.get(selectedSkillId) ?? null : null;

  const handleStatusChange = async (skillId: string, nextStatus: SkillNodeStatus) => {
    setUpdatingId(skillId);
    try {
      await onUpdateSkillStatus(skillId, nextStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 flex flex-col bg-[#FAFAFC] dark:bg-[#050507] p-4'
    : 'relative flex flex-col rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0A0A10] overflow-hidden';

  return (
    <div className={containerClass} data-testid="skill-tree-workspace">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 px-4 py-3 bg-white/90 dark:bg-[#101018]/90">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchFocus();
              }}
              placeholder="Find skill node..."
              aria-label="Search skill nodes"
              className="w-48 sm:w-56 rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-[#050507] pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-[#8B5CF6] focus:outline-none"
            />
          </div>
          {matchedIds.size > 0 && (
            <button
              type="button"
              onClick={handleSearchFocus}
              className="rounded-lg bg-[#8B5CF6]/15 px-2.5 py-1.5 text-xs font-medium text-[#7C3AED] dark:text-[#C4B5FD]"
            >
              Center match ({matchedIds.size})
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-black/10 dark:border-white/10 p-0.5 bg-black/5 dark:bg-[#050507]">
            <button
              type="button"
              onClick={() => setViewMode('graph')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'graph'
                  ? 'bg-white dark:bg-[#101018] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Graph
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-[#101018] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Accessible List
            </button>
          </div>

          {viewMode === 'graph' && (
            <button
              type="button"
              onClick={() => fitView({ padding: 0.22, duration: 400 })}
              className="rounded-lg border border-black/10 dark:border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
            >
              Fit View
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreen((f) => !f)}
            aria-label={isFullscreen ? 'Exit full screen' : 'Full screen skill tree'}
            className="rounded-lg border border-black/10 dark:border-white/10 p-1.5 text-slate-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-b border-black/5 dark:border-white/5 px-4 py-2 text-[11px] text-slate-600 dark:text-zinc-400 bg-black/[0.015] dark:bg-white/[0.015]">
        {(['completed', 'in_progress', 'available', 'optional_milestone', 'not_started'] as SkillNodeStatus[]).map(
          (st) => (
            <span key={st} className="inline-flex items-center gap-1.5">
              {STATUS_META[st].icon}
              <span>{STATUS_META[st].label}</span>
            </span>
          )
        )}
      </div>

      {/* Main Content Area + Side Panel */}
      <div className={`relative flex w-full ${isFullscreen ? 'flex-1 min-h-0' : 'h-[600px] sm:h-[660px]'}`}>
        {viewMode === 'graph' ? (
          <div className="w-full h-full flex-1" style={{ minHeight: 540 }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={(_evt, node) => setSelectedSkillId(node.id)}
              fitView
              fitViewOptions={{ padding: 0.22 }}
              minZoom={0.35}
              maxZoom={1.7}
            >
              <Background gap={24} size={1} color="rgba(139,92,246,0.12)" />
              <Controls className="!bg-white dark:!bg-[#101018] !border-black/10 dark:!border-white/10" />
              <MiniMap
                pannable
                zoomable
                className="!bg-white/90 dark:!bg-[#101018]/90 !border !border-black/10 dark:!border-white/10"
                nodeColor={(n) => {
                  const st = (n.data as SkillNodeFlowData)?.skill?.status;
                  if (st === 'completed') return '#34D399';
                  if (st === 'in_progress') return '#8B5CF6';
                  if (st === 'available') return '#38BDF8';
                  if (st === 'optional_milestone') return '#FBBF24';
                  return '#52525B';
                }}
              />
            </ReactFlow>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {roadmap.stages.map((stage) => (
              <section key={stage.stageNumber} className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-black/10 dark:border-white/10 pb-2">
                  <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    Stage {stage.stageNumber}: {stage.title}
                  </h3>
                  <span className="font-mono text-xs text-slate-500 dark:text-zinc-400">
                    {stage.estimatedWeeks}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {stage.skills.map((skill) => {
                    const meta = STATUS_META[skill.status];
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => setSelectedSkillId(skill.id)}
                        className={`rounded-xl border p-4 text-left transition-colors ${meta.border} ${
                          selectedSkillId === skill.id ? 'ring-2 ring-[#8B5CF6]' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className={`inline-flex items-center gap-1.5 font-medium ${meta.badge}`}>
                            {meta.icon}
                            {meta.label}
                          </span>
                          <span className="font-mono text-slate-500 dark:text-zinc-400 tabular-nums">
                            {skill.estimatedHours} hrs
                          </span>
                        </div>
                        <div className="mt-2 font-display text-sm font-semibold text-slate-900 dark:text-white">
                          {skill.title}
                        </div>
                        <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400 line-clamp-2">
                          {skill.summary}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Contextual Skill Side Panel */}
        {selectedSkill && (
          <aside
            aria-label={`Skill details for ${selectedSkill.title}`}
            className="absolute right-0 top-0 bottom-0 z-20 w-full sm:w-[390px] overflow-y-auto border-l border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500 dark:text-zinc-400">
                  Stage {selectedSkill.stageNumber} · {selectedSkill.stageTitle}
                </div>
                <h3 className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white">
                  {selectedSkill.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSkillId(null)}
                aria-label="Close skill panel"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-zinc-400">
              <span className={`inline-flex items-center gap-1.5 font-medium ${STATUS_META[selectedSkill.status].badge}`}>
                {STATUS_META[selectedSkill.status].icon}
                {STATUS_META[selectedSkill.status].label}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                <Clock className="w-3.5 h-3.5" />
                {selectedSkill.estimatedHours} hrs estimated
              </span>
            </div>

            {/* Completion Controls */}
            <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-xl bg-black/5 dark:bg-[#050507] p-1">
              {(
                [
                  { id: 'available', label: 'Available' },
                  { id: 'in_progress', label: 'In Progress' },
                  { id: 'completed', label: 'Completed' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={updatingId === selectedSkill.id}
                  onClick={() => handleStatusChange(selectedSkill.id, opt.id)}
                  className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
                    selectedSkill.status === opt.id
                      ? 'bg-[#8B5CF6] text-white'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-5 text-sm">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Overview
                </h4>
                <p className="mt-1.5 text-slate-700 dark:text-zinc-300 leading-relaxed">
                  {selectedSkill.summary}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Why it matters
                </h4>
                <p className="mt-1.5 text-slate-700 dark:text-zinc-300 leading-relaxed">
                  {selectedSkill.whyItMatters}
                </p>
              </div>

              {selectedSkill.prerequisites.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Prerequisites
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedSkill.prerequisites.map((pid) => {
                      const pSkill = skillMap.get(pid);
                      if (!pSkill) return null;
                      return (
                        <button
                          key={pid}
                          type="button"
                          onClick={() => setSelectedSkillId(pid)}
                          className="rounded-lg border border-black/10 dark:border-white/10 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:border-[#8B5CF6]"
                        >
                          {pSkill.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Practice Exercises
                </h4>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-700 dark:text-zinc-300">
                  {selectedSkill.practiceExercises.map((ex, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-[#38BDF8] shrink-0" />
                      <span>{ex}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Practical Projects
                </h4>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-700 dark:text-zinc-300">
                  {selectedSkill.projectIdeas.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-[#8B5CF6] shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {selectedSkill.resourceIds.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Verified Learning Resources
                  </h4>
                  <div className="mt-2 space-y-2">
                    {selectedSkill.resourceIds.map((rid) => {
                      const res = VERIFIED_RESOURCES.find((r) => r.id === rid);
                      if (!res) return null;
                      return (
                        <a
                          key={rid}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-2 rounded-xl border border-black/10 dark:border-white/10 p-2.5 text-xs hover:border-[#8B5CF6] transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <BookOpen className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                            <div className="min-w-0">
                              <div className="truncate font-medium text-slate-900 dark:text-white">
                                {res.title}
                              </div>
                              <div className="truncate text-[11px] text-slate-500 dark:text-zinc-400">
                                {res.provider} · {res.cost}
                              </div>
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => onAskMentorAboutSkill(selectedSkill)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B5CF6] py-2.5 text-xs font-semibold text-white hover:bg-[#7C3AED] transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ask AI Mentor About This Skill
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export const SkillTreeGraph: React.FC<SkillTreeGraphProps> = (props) => (
  <ReactFlowProvider>
    <SkillTreeInner {...props} />
  </ReactFlowProvider>
);

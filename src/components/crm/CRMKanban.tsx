import { useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, MoreVertical, Clock, User, Phone, Mail, Sparkles, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CRMLead, CRMStage, useCRMLeads } from '@/hooks/useCRM';

interface CRMKanbanProps {
  pipelineId: string;
  stages: CRMStage[];
  onLeadClick: (lead: CRMLead) => void;
  onNewLead: (stageId: string) => void;
  filteredLeads?: CRMLead[];
}

export function CRMKanban({ pipelineId, stages, onLeadClick, onNewLead, filteredLeads }: CRMKanbanProps) {
  const { leads: allLeads, moveLead } = useCRMLeads(pipelineId);
  
  // Use filtered leads if provided, otherwise use all leads
  const leads = filteredLeads ?? allLeads;

  // Group leads by stage
  const leadsByStage = useMemo(() => {
    const grouped: Record<string, CRMLead[]> = {};
    stages.forEach(stage => {
      grouped[stage.id] = leads.filter(lead => lead.stage_id === stage.id);
    });
    return grouped;
  }, [leads, stages]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Move lead to new stage
    moveLead.mutate({
      leadId: draggableId,
      toStageId: destination.droppableId,
    });
  };

  const getStageValue = (stageId: string) => {
    const stageLeads = leadsByStage[stageId] || [];
    return stageLeads.reduce((acc, lead) => acc + (lead.estimated_value || 0), 0);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <ScrollArea className="w-full">
        <div className="flex gap-4 p-4 min-w-max">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className="w-80 flex-shrink-0"
            >
              {/* Stage Header */}
              <div
                className="rounded-t-lg px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: `${stage.color}20`, borderTop: `3px solid ${stage.color}` }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{stage.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {(leadsByStage[stage.id] || []).length}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  {getStageValue(stage.id) > 0 && (
                    <span className="text-xs text-muted-foreground">
                      R$ {(getStageValue(stage.id) / 1000).toFixed(0)}k
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onNewLead(stage.id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Stage Cards */}
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-h-[calc(100vh-280px)] rounded-b-lg p-2 transition-colors",
                      "bg-muted/30 border border-t-0 border-border/50",
                      snapshot.isDraggingOver && "bg-primary/5 border-primary/30"
                    )}
                  >
                    <div className="space-y-2">
                      {(leadsByStage[stage.id] || []).map((lead, leadIndex) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={leadIndex}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <LeadCard
                                lead={lead}
                                onClick={() => onLeadClick(lead)}
                                isDragging={snapshot.isDragging}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </DragDropContext>
  );
}

interface LeadCardProps {
  lead: CRMLead;
  onClick: () => void;
  isDragging: boolean;
}

function LeadCard({ lead, onClick, isDragging }: LeadCardProps) {
  const hasAI = !!lead.ai_analyzed_at;
  const isStale = lead.is_stale;
  const isPriority = lead.is_priority;
  
  // Calculate BANT score if available
  const bantScores = [
    lead.budget_score,
    lead.authority_score,
    lead.need_score,
    lead.timing_score,
  ].filter((s): s is number => s !== null);
  
  const avgBantScore = bantScores.length > 0 
    ? bantScores.reduce((a, b) => a + b, 0) / bantScores.length 
    : null;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-3 cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
        isDragging && "shadow-lg rotate-2 scale-105",
        isStale && "border-orange-500/50 bg-orange-500/5",
        isPriority && "border-yellow-500/50 bg-yellow-500/5"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{lead.name}</h4>
          {lead.source_detail && (
            <p className="text-xs text-muted-foreground truncate">
              via {lead.source_detail}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isPriority && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="h-5 px-1 border-yellow-500 text-yellow-500">
                  ⭐
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Prioritário</TooltipContent>
            </Tooltip>
          )}
          {isStale && (
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </TooltipTrigger>
              <TooltipContent>Lead parado há muito tempo</TooltipContent>
            </Tooltip>
          )}
          {hasAI && (
            <Tooltip>
              <TooltipTrigger>
                <Sparkles className="h-4 w-4 text-primary" />
              </TooltipTrigger>
              <TooltipContent>Analisado pela IA</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
        {lead.phone && (
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            <span className="truncate max-w-[100px]">{lead.phone}</span>
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
          </div>
        )}
      </div>

      {/* BANT Mini Score */}
      {avgBantScore !== null && (
        <div className="flex items-center gap-1 mb-2">
          <div className="flex gap-0.5">
            {[
              { score: lead.budget_score, label: 'B', color: 'bg-green-500' },
              { score: lead.authority_score, label: 'A', color: 'bg-blue-500' },
              { score: lead.need_score, label: 'N', color: 'bg-purple-500' },
              { score: lead.timing_score, label: 'T', color: 'bg-orange-500' },
            ].map((item, idx) => (
              <Tooltip key={idx}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center text-white",
                      item.score === null ? "bg-muted text-muted-foreground" :
                      item.score >= 8 ? item.color :
                      item.score >= 5 ? "bg-yellow-500" :
                      "bg-red-500"
                    )}
                  >
                    {item.label}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {item.label === 'B' && 'Budget'}: {item.score ?? '-'}/10
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          <span className={cn(
            "text-[10px] font-medium ml-1",
            avgBantScore >= 7 ? "text-green-600" :
            avgBantScore >= 5 ? "text-yellow-600" :
            "text-red-600"
          )}>
            {avgBantScore.toFixed(0)}
          </span>
        </div>
      )}

      {/* Tags */}
      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {lead.tags.slice(0, 2).map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
          {lead.tags.length > 2 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              +{lead.tags.length - 2}
            </Badge>
          )}
        </div>
      )}

      {/* Lead Score */}
      {lead.lead_score !== null && lead.lead_score > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  lead.lead_score >= 30 ? "bg-green-500" :
                  lead.lead_score >= 20 ? "bg-yellow-500" :
                  "bg-red-500"
                )}
                style={{ width: `${Math.min(lead.lead_score * 2.5, 100)}%` }}
              />
            </div>
            <span className="text-xs font-medium">{lead.lead_score}</span>
          </div>
        </div>
      )}

      {/* Value & Time */}
      <div className="flex items-center justify-between text-xs">
        {lead.estimated_value ? (
          <span className="font-medium text-green-600">
            R$ {lead.estimated_value.toLocaleString('pt-BR')}
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {formatDistanceToNow(new Date(lead.last_activity_at || lead.created_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </span>
        </div>
      </div>

      {/* Assigned */}
      {lead.assigned_profile && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span className="truncate">{lead.assigned_profile.full_name}</span>
        </div>
      )}

      {/* AI Summary Preview */}
      {lead.ai_summary && (
        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t line-clamp-2">
          💡 {lead.ai_summary}
        </p>
      )}
    </Card>
  );
}

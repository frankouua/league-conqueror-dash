import { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CRMLead, CRMStage, useCRMLeads } from '@/hooks/useCRM';
import { CRMKanbanCard } from './CRMKanbanCard';

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
        <div className="flex gap-3 sm:gap-4 p-2 sm:p-4 min-w-max">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className="w-72 sm:w-80 flex-shrink-0"
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

              {/* Stage Cards - with internal scroll */}
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "h-[calc(100vh-320px)] sm:h-[calc(100vh-280px)] rounded-b-lg p-1.5 sm:p-2 transition-colors overflow-y-auto overflow-x-hidden",
                      "bg-muted/30 border border-t-0 border-border/50 kanban-column-scroll",
                      snapshot.isDraggingOver && "bg-primary/5 border-primary/30"
                    )}
                  >
                    <div className="space-y-2 pb-2">
                      {(leadsByStage[stage.id] || []).map((lead, leadIndex) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={leadIndex}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                transform: snapshot.isDragging 
                                  ? provided.draggableProps.style?.transform 
                                  : 'none',
                              }}
                            >
                              <CRMKanbanCard
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

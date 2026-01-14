import { useMemo, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { CRMLead, CRMStage, useCRMLeads } from '@/hooks/useCRM';
import { CRMKanbanCard } from './CRMKanbanCard';
import { CRMBulkToolbar } from './CRMBulkToolbar';

interface CRMKanbanProps {
  pipelineId: string;
  stages: CRMStage[];
  onLeadClick: (lead: CRMLead) => void;
  onNewLead: (stageId: string) => void;
  filteredLeads?: CRMLead[];
}

export function CRMKanban({ pipelineId, stages, onLeadClick, onNewLead, filteredLeads }: CRMKanbanProps) {
  const { leads: allLeads, moveLead } = useCRMLeads(pipelineId);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
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

  // Selection handlers
  const toggleLeadSelection = useCallback((leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      // Auto enable selection mode
      if (next.size > 0) setIsSelectionMode(true);
      if (next.size === 0) setIsSelectionMode(false);
      return next;
    });
  }, []);

  const toggleStageSelection = useCallback((stageId: string) => {
    const stageLeadIds = (leadsByStage[stageId] || []).map(l => l.id);
    setSelectedLeads(prev => {
      const allSelected = stageLeadIds.every(id => prev.has(id));
      const next = new Set(prev);
      
      if (allSelected) {
        // Deselect all from stage
        stageLeadIds.forEach(id => next.delete(id));
      } else {
        // Select all from stage
        stageLeadIds.forEach(id => next.add(id));
      }
      
      if (next.size > 0) setIsSelectionMode(true);
      if (next.size === 0) setIsSelectionMode(false);
      return next;
    });
  }, [leadsByStage]);

  const clearSelection = useCallback(() => {
    setSelectedLeads(new Set());
    setIsSelectionMode(false);
  }, []);

  const isStageFullySelected = (stageId: string) => {
    const stageLeadIds = (leadsByStage[stageId] || []).map(l => l.id);
    return stageLeadIds.length > 0 && stageLeadIds.every(id => selectedLeads.has(id));
  };

  const isStagePartiallySelected = (stageId: string) => {
    const stageLeadIds = (leadsByStage[stageId] || []).map(l => l.id);
    const selectedCount = stageLeadIds.filter(id => selectedLeads.has(id)).length;
    return selectedCount > 0 && selectedCount < stageLeadIds.length;
  };

  return (
    <>
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
                    {/* Stage Selection Checkbox */}
                    {(leadsByStage[stage.id] || []).length > 0 && (
                      <Checkbox
                        checked={isStageFullySelected(stage.id)}
                        className={cn(
                          "border-muted-foreground/50",
                          isStagePartiallySelected(stage.id) && "opacity-50"
                        )}
                        onCheckedChange={() => toggleStageSelection(stage.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
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
                                className="relative group"
                              >
                                {/* Selection Checkbox */}
                                <div 
                                  className={cn(
                                    "absolute top-2 left-2 z-10 transition-opacity",
                                    isSelectionMode || selectedLeads.has(lead.id) 
                                      ? "opacity-100" 
                                      : "opacity-0 group-hover:opacity-100"
                                  )}
                                  onClick={(e) => toggleLeadSelection(lead.id, e)}
                                >
                                  <Checkbox
                                    checked={selectedLeads.has(lead.id)}
                                    className="bg-background shadow-sm"
                                  />
                                </div>

                                <div className={cn(
                                  selectedLeads.has(lead.id) && "ring-2 ring-primary ring-offset-1 rounded-lg"
                                )}>
                                  <CRMKanbanCard
                                    lead={lead}
                                    onClick={() => {
                                      if (isSelectionMode) {
                                        toggleLeadSelection(lead.id, { stopPropagation: () => {} } as any);
                                      } else {
                                        onLeadClick(lead);
                                      }
                                    }}
                                    isDragging={snapshot.isDragging}
                                  />
                                </div>
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

      {/* Bulk Toolbar */}
      <CRMBulkToolbar
        selectedLeads={Array.from(selectedLeads)}
        onClearSelection={clearSelection}
        currentPipelineId={pipelineId}
      />
    </>
  );
}

import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { KanbanColumnConfig, KanbanLead } from "./kanbanTypes";
import KanbanCard from "./KanbanCard";

interface Props {
  column: KanbanColumnConfig;
  leads: KanbanLead[];
  onLeadClick: (lead: KanbanLead) => void;
}

const KanbanColumn = ({ column, leads, onLeadClick }: Props) => {
  return (
    <div className={`flex-shrink-0 w-72 md:w-80 rounded-xl border ${column.borderColor} ${column.bgColor}`}>
      {/* Column Header */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-1">
          <h3 className={`font-bold ${column.color}`}>{column.title}</h3>
          <Badge variant="secondary" className="text-xs font-semibold">
            {leads.length}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{column.subtitle}</p>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={column.status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`p-2 min-h-[300px] max-h-[calc(100vh-300px)] overflow-y-auto transition-colors ${
              snapshot.isDraggingOver ? "bg-primary/5" : ""
            }`}
          >
            {leads.map((lead, index) => (
              <Draggable key={lead.id} draggableId={lead.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`mb-2 ${snapshot.isDragging ? "opacity-90" : ""}`}
                  >
                    <KanbanCard
                      lead={lead}
                      onClick={() => onLeadClick(lead)}
                      isDragging={snapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {leads.length === 0 && (
              <p className="text-center text-muted-foreground text-xs py-8">
                Arraste leads para cá
              </p>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;

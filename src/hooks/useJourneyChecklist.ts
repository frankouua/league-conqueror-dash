import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type ChecklistState = Record<number, Record<number, boolean>>;

export const useJourneyChecklist = () => {
  const { user } = useAuth();
  const [checklist, setChecklist] = useState<ChecklistState>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load checklist from database
  const loadChecklist = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('journey_checklist_progress')
        .select('stage_id, action_index, completed')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading checklist:', error);
        return;
      }

      // Convert array to nested object structure
      const checklistState: ChecklistState = {};
      data?.forEach((item) => {
        if (!checklistState[item.stage_id]) {
          checklistState[item.stage_id] = {};
        }
        checklistState[item.stage_id][item.action_index] = item.completed;
      });

      setChecklist(checklistState);
    } catch (error) {
      console.error('Error loading checklist:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  // Toggle action completion
  const toggleAction = async (stageId: number, actionIndex: number) => {
    if (!user?.id) return;

    const currentValue = checklist[stageId]?.[actionIndex] || false;
    const newValue = !currentValue;

    // Optimistic update
    setChecklist((prev) => ({
      ...prev,
      [stageId]: {
        ...prev[stageId],
        [actionIndex]: newValue,
      },
    }));

    try {
      if (newValue) {
        // Insert or update to completed
        const { error } = await supabase
          .from('journey_checklist_progress')
          .upsert({
            user_id: user.id,
            stage_id: stageId,
            action_index: actionIndex,
            completed: true,
          }, {
            onConflict: 'user_id,stage_id,action_index'
          });

        if (error) throw error;
      } else {
        // Delete the record when unchecked
        const { error } = await supabase
          .from('journey_checklist_progress')
          .delete()
          .eq('user_id', user.id)
          .eq('stage_id', stageId)
          .eq('action_index', actionIndex);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving checklist:', error);
      // Revert on error
      setChecklist((prev) => ({
        ...prev,
        [stageId]: {
          ...prev[stageId],
          [actionIndex]: currentValue,
        },
      }));
    }
  };

  // Reset stage checklist
  const resetStageChecklist = async (stageId: number) => {
    if (!user?.id) return;

    // Optimistic update
    setChecklist((prev) => {
      const newState = { ...prev };
      delete newState[stageId];
      return newState;
    });

    try {
      const { error } = await supabase
        .from('journey_checklist_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('stage_id', stageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error resetting checklist:', error);
      // Reload on error
      loadChecklist();
    }
  };

  // Get stage progress percentage
  const getStageProgress = (stageId: number, actionsCount: number) => {
    if (!checklist[stageId]) return 0;
    const completed = Object.values(checklist[stageId]).filter(Boolean).length;
    return Math.round((completed / actionsCount) * 100);
  };

  // Get total progress across all stages
  const getTotalProgress = (stages: { id: number; actions: string[] }[]) => {
    let totalActions = 0;
    let completedActions = 0;

    stages.forEach((stage) => {
      totalActions += stage.actions.length;
      if (checklist[stage.id]) {
        completedActions += Object.values(checklist[stage.id]).filter(Boolean).length;
      }
    });

    return totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;
  };

  return {
    checklist,
    isLoading,
    toggleAction,
    resetStageChecklist,
    getStageProgress,
    getTotalProgress,
  };
};

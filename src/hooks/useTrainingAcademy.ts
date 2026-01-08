import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TrainingMaterial {
  id: string;
  title: string;
  description: string | null;
  category: string;
  material_type: string;
  file_url: string | null;
  external_url: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  difficulty_level: string;
  xp_reward: number;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export interface TrainingQuiz {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty_level: string;
  time_limit_minutes: number | null;
  passing_score: number;
  xp_reward: number;
  max_attempts: number | null;
  questions: QuizQuestion[];
  is_active: boolean;
  order_index: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
}

export interface TrainingSimulation {
  id: string;
  title: string;
  description: string | null;
  scenario_type: string;
  difficulty_level: string;
  context: SimulationContext;
  xp_reward: number;
  is_active: boolean;
  order_index: number;
}

export interface SimulationContext {
  patient_profile: string;
  situation: string;
  goal: string;
  evaluation_criteria: string[];
}

export interface TrainingTrack {
  id: string;
  title: string;
  description: string | null;
  target_role: string | null;
  total_xp: number;
  badge_name: string | null;
  badge_icon: string | null;
  steps: TrackStep[];
  is_active: boolean;
  order_index: number;
}

export interface TrackStep {
  type: 'material' | 'quiz' | 'simulation';
  reference_id: string;
  title: string;
  xp: number;
}

export interface UserStats {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  materials_completed: number;
  quizzes_passed: number;
  simulations_completed: number;
  tracks_completed: number;
  current_streak_days: number;
  best_streak_days: number;
  last_activity_at: string | null;
  badges: string[];
}

export interface LeaderboardEntry {
  user_id: string;
  total_xp: number;
  current_level: number;
  full_name: string;
  avatar_url: string | null;
  position: string | null;
}

const LEVEL_NAMES: Record<number, string> = {
  1: "Iniciante 🌱",
  2: "Vendedor Júnior 📈",
  3: "Vendedor Júnior 📈",
  4: "Vendedor Júnior 📈",
  5: "Vendedor Pleno 🎯",
  6: "Vendedor Pleno 🎯",
  7: "Vendedor Pleno 🎯",
  8: "Vendedor Pleno 🎯",
  9: "Vendedor Pleno 🎯",
  10: "Vendedor Sênior ⭐",
  11: "Vendedor Sênior ⭐",
  12: "Vendedor Sênior ⭐",
  13: "Vendedor Sênior ⭐",
  14: "Vendedor Sênior ⭐",
  15: "Expert Comercial 💎",
  16: "Expert Comercial 💎",
  17: "Expert Comercial 💎",
  18: "Expert Comercial 💎",
  19: "Expert Comercial 💎",
  20: "Mestre Vendedor 🏆",
};

export const getLevelName = (level: number): string => {
  if (level >= 20) return "Mestre Vendedor 🏆";
  return LEVEL_NAMES[level] || "Iniciante 🌱";
};

export const getXpForNextLevel = (currentLevel: number): number => {
  return currentLevel * 500;
};

export const getXpProgress = (totalXp: number, currentLevel: number): number => {
  const currentLevelXp = (currentLevel - 1) * 500;
  const nextLevelXp = currentLevel * 500;
  const progressXp = totalXp - currentLevelXp;
  const neededXp = nextLevelXp - currentLevelXp;
  return Math.min(100, (progressXp / neededXp) * 100);
};

export function useTrainingAcademy() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch materials
  const { data: materials = [], isLoading: materialsLoading } = useQuery({
    queryKey: ["training-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_materials")
        .select("*")
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data as TrainingMaterial[];
    },
  });

  // Fetch user material progress
  const { data: materialProgress = [] } = useQuery({
    queryKey: ["training-material-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("training_material_progress")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch quizzes
  const { data: quizzes = [], isLoading: quizzesLoading } = useQuery({
    queryKey: ["training-quizzes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_quizzes")
        .select("*")
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data.map(q => ({
        ...q,
        questions: q.questions as unknown as QuizQuestion[]
      })) as TrainingQuiz[];
    },
  });

  // Fetch user quiz attempts
  const { data: quizAttempts = [] } = useQuery({
    queryKey: ["training-quiz-attempts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("training_quiz_attempts")
        .select("*")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch simulations
  const { data: simulations = [], isLoading: simulationsLoading } = useQuery({
    queryKey: ["training-simulations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_simulations")
        .select("*")
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data.map(s => ({
        ...s,
        context: s.context as unknown as SimulationContext
      })) as TrainingSimulation[];
    },
  });

  // Fetch simulation attempts
  const { data: simulationAttempts = [] } = useQuery({
    queryKey: ["training-simulation-attempts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("training_simulation_attempts")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch tracks
  const { data: tracks = [], isLoading: tracksLoading } = useQuery({
    queryKey: ["training-tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_tracks")
        .select("*")
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data.map(t => ({
        ...t,
        steps: t.steps as unknown as TrackStep[]
      })) as TrainingTrack[];
    },
  });

  // Fetch track progress
  const { data: trackProgress = [] } = useQuery({
    queryKey: ["training-track-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("training_track_progress")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user stats
  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ["training-user-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("training_user_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data ? {
        ...data,
        badges: data.badges as unknown as string[]
      } as UserStats : null;
    },
    enabled: !!user?.id,
  });

  // Fetch leaderboard
  const { data: leaderboard = [] } = useQuery({
    queryKey: ["training-leaderboard"],
    queryFn: async () => {
      const { data: stats, error: statsError } = await supabase
        .from("training_user_stats")
        .select("user_id, total_xp, current_level")
        .order("total_xp", { ascending: false })
        .limit(20);
      
      if (statsError) throw statsError;
      if (!stats?.length) return [];

      const userIds = stats.map(s => s.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, position")
        .in("user_id", userIds);
      
      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return stats.map(s => ({
        ...s,
        full_name: profileMap.get(s.user_id)?.full_name || "Usuário",
        avatar_url: profileMap.get(s.user_id)?.avatar_url || null,
        position: profileMap.get(s.user_id)?.position || null,
      })) as LeaderboardEntry[];
    },
  });

  // Add XP mutation
  const addXpMutation = useMutation({
    mutationFn: async ({ xpAmount, sourceType, sourceId, description }: {
      xpAmount: number;
      sourceType: string;
      sourceId?: string;
      description?: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { data, error } = await supabase.rpc("add_training_xp", {
        p_user_id: user.id,
        p_xp_amount: xpAmount,
        p_source_type: sourceType,
        p_source_id: sourceId || null,
        p_description: description || null,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (newTotal) => {
      queryClient.invalidateQueries({ queryKey: ["training-user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["training-leaderboard"] });
      toast.success(`+${newTotal} XP ganhos!`);
    },
  });

  // Complete material mutation
  const completeMaterialMutation = useMutation({
    mutationFn: async ({ materialId, xpReward }: { materialId: string; xpReward: number }) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Check if already completed
      const existing = materialProgress.find(p => p.material_id === materialId);
      if (existing?.completed_at) {
        throw new Error("Material já concluído");
      }

      // Upsert progress
      const { error: progressError } = await supabase
        .from("training_material_progress")
        .upsert({
          user_id: user.id,
          material_id: materialId,
          completed_at: new Date().toISOString(),
          progress_percent: 100,
          xp_earned: xpReward,
        }, { onConflict: "user_id,material_id" });

      if (progressError) throw progressError;

      // Add XP
      await addXpMutation.mutateAsync({
        xpAmount: xpReward,
        sourceType: "material",
        sourceId: materialId,
        description: "Material de treinamento concluído",
      });

      // Update stats
      const { error: statsError } = await supabase
        .from("training_user_stats")
        .upsert({
          user_id: user.id,
          materials_completed: (userStats?.materials_completed || 0) + 1,
          last_activity_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (statsError) throw statsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-material-progress"] });
      queryClient.invalidateQueries({ queryKey: ["training-user-stats"] });
      toast.success("Material concluído! 🎉");
    },
    onError: (error) => {
      if (error.message !== "Material já concluído") {
        toast.error("Erro ao registrar conclusão");
      }
    },
  });

  // Submit quiz mutation
  const submitQuizMutation = useMutation({
    mutationFn: async ({ quizId, answers, timeTaken }: {
      quizId: string;
      answers: number[];
      timeTaken: number;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const quiz = quizzes.find(q => q.id === quizId);
      if (!quiz) throw new Error("Quiz não encontrado");

      // Calculate score
      const correctAnswers = answers.filter((ans, idx) => 
        ans === quiz.questions[idx]?.correct_index
      ).length;
      const score = Math.round((correctAnswers / quiz.questions.length) * 100);
      const passed = score >= quiz.passing_score;
      const xpEarned = passed ? quiz.xp_reward : Math.round(quiz.xp_reward * 0.2);

      // Save attempt
      const { error: attemptError } = await supabase
        .from("training_quiz_attempts")
        .insert({
          user_id: user.id,
          quiz_id: quizId,
          answers,
          score,
          passed,
          time_taken_seconds: timeTaken,
          xp_earned: xpEarned,
        });

      if (attemptError) throw attemptError;

      // Add XP
      await addXpMutation.mutateAsync({
        xpAmount: xpEarned,
        sourceType: "quiz",
        sourceId: quizId,
        description: passed ? "Quiz aprovado!" : "Quiz tentativa",
      });

      // Update stats if passed
      if (passed) {
        await supabase
          .from("training_user_stats")
          .upsert({
            user_id: user.id,
            quizzes_passed: (userStats?.quizzes_passed || 0) + 1,
            last_activity_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
      }

      return { score, passed, xpEarned, correctAnswers, total: quiz.questions.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["training-quiz-attempts"] });
      queryClient.invalidateQueries({ queryKey: ["training-user-stats"] });
      if (result.passed) {
        toast.success(`Aprovado! ${result.score}% (${result.correctAnswers}/${result.total}) 🎉`);
      } else {
        toast.info(`${result.score}% - Tente novamente para passar!`);
      }
    },
    onError: () => {
      toast.error("Erro ao enviar quiz");
    },
  });

  // Check if material is completed
  const isMaterialCompleted = (materialId: string) => {
    return materialProgress.some(p => p.material_id === materialId && p.completed_at);
  };

  // Get best quiz score
  const getBestQuizScore = (quizId: string) => {
    const attempts = quizAttempts.filter(a => a.quiz_id === quizId);
    if (!attempts.length) return null;
    return Math.max(...attempts.map(a => a.score));
  };

  // Check if quiz is passed
  const isQuizPassed = (quizId: string) => {
    return quizAttempts.some(a => a.quiz_id === quizId && a.passed);
  };

  return {
    // Data
    materials,
    materialProgress,
    quizzes,
    quizAttempts,
    simulations,
    simulationAttempts,
    tracks,
    trackProgress,
    userStats,
    leaderboard,
    
    // Loading states
    isLoading: materialsLoading || quizzesLoading || simulationsLoading || tracksLoading || statsLoading,
    
    // Mutations
    completeMaterial: completeMaterialMutation.mutate,
    submitQuiz: submitQuizMutation.mutateAsync,
    addXp: addXpMutation.mutate,
    
    // Helpers
    isMaterialCompleted,
    getBestQuizScore,
    isQuizPassed,
    getLevelName,
    getXpForNextLevel,
    getXpProgress,
  };
}

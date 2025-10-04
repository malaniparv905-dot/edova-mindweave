import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface StudySession {
  id: string;
  session_type: string;
  scheduled_date: string;
  completed: boolean;
  topics: {
    name: string;
    subjects: {
      name: string;
    };
  };
}

export const PlannerView = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from('study_sessions')
      .select(`
        id,
        session_type,
        scheduled_date,
        completed,
        topics (
          name,
          subjects (
            name
          )
        )
      `)
      .order('scheduled_date', { ascending: true })
      .limit(20);

    if (!error && data) {
      setSessions(data as any);
    }
  };

  const completeSession = async (sessionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('study_sessions')
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq('id', sessionId);

      await supabase.from('xp_logs').insert({
        user_id: user.id,
        amount: 100,
        source: 'Task Completion'
      });

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('xp')
        .eq('user_id', user.id)
        .single();

      await supabase
        .from('user_profiles')
        .update({ xp: (profile?.xp || 0) + 100 })
        .eq('user_id', user.id);

      toast.success("+100 XP earned!");
      loadSessions();
      window.location.reload(); // Refresh to update XP in header
    } catch (error) {
      console.error(error);
      toast.error("Failed to complete session");
    }
  };

  const generatePlan = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: topics } = await supabase
        .from('topics')
        .select(`
          id,
          name,
          priority_score,
          performance_score,
          confidence_level,
          last_studied,
          subjects (
            id,
            user_id
          )
        `)
        .eq('subjects.user_id', user.id);

      if (!topics || topics.length === 0) {
        toast.error("Please add subjects and topics first");
        setLoading(false);
        return;
      }

      await supabase.from('study_sessions').delete().eq('completed', false);

      const sortedTopics = [...topics].sort((a, b) => {
        const confidenceMismatchA = Math.abs(a.confidence_level - a.performance_score);
        const confidenceMismatchB = Math.abs(b.confidence_level - b.performance_score);
        
        const priorityA = (100 - a.performance_score) + confidenceMismatchA;
        const priorityB = (100 - b.performance_score) + confidenceMismatchB;
        
        return priorityB - priorityA;
      });

      const today = new Date();
      const sessions = [];
      
      for (let i = 0; i < Math.min(sortedTopics.length, 10); i++) {
        const topic = sortedTopics[i];
        const sessionDate = new Date(today);
        sessionDate.setDate(today.getDate() + i);
        
        let sessionType = 'Focused';
        const confidenceMismatch = Math.abs(topic.confidence_level - topic.performance_score);
        
        if (topic.performance_score < 40 || confidenceMismatch > 30) {
          sessionType = 'Intense';
        } else if (topic.performance_score > 70) {
          sessionType = 'Passive Review';
        }

        sessions.push({
          topic_id: topic.id,
          session_type: sessionType,
          scheduled_date: sessionDate.toISOString().split('T')[0]
        });
      }

      await supabase.from('study_sessions').insert(sessions);
      
      toast.success("Study plan generated successfully!");
      loadSessions();
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" />
          Study Planner
        </h2>
        <Button onClick={generatePlan} disabled={loading}>
          {loading ? "Generating..." : "Generate New Plan"}
        </Button>
      </div>

      <div className="space-y-3">
        {sessions.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">No study sessions scheduled. Click "Generate New Plan" to create one!</p>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card key={session.id} className={`p-4 ${session.completed ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {session.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <Circle className="w-6 h-6 text-muted-foreground" />
                  )}
                  <div>
                    <h4 className="font-semibold">
                      {session.topics.subjects.name} - {session.topics.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {session.session_type} • {format(new Date(session.scheduled_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                {!session.completed && (
                  <Button
                    onClick={() => completeSession(session.id)}
                    variant="outline"
                    size="sm"
                  >
                    Mark Done
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

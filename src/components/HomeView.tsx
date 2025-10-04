import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Lightbulb, Clock } from "lucide-react";
import { format } from "date-fns";

const MOTIVATIONAL_QUOTES = [
  "Success is the sum of small efforts repeated day in and day out.",
  "The expert in anything was once a beginner.",
  "Don't watch the clock; do what it does. Keep going.",
  "Your limitation—it's only your imagination.",
  "The secret of getting ahead is getting started.",
  "Study while others are sleeping; work while others are loafing.",
];

interface StudySession {
  id: string;
  session_type: string;
  scheduled_date: string;
  topics: {
    name: string;
    subjects: {
      name: string;
    };
  };
}

export const HomeView = () => {
  const [quote, setQuote] = useState("");
  const [upcomingSessions, setUpcomingSessions] = useState<StudySession[]>([]);

  useEffect(() => {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('quote-date');
    const savedQuote = localStorage.getItem('daily-quote');
    
    if (savedDate === today && savedQuote) {
      setQuote(savedQuote);
    } else {
      const newQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
      setQuote(newQuote);
      localStorage.setItem('quote-date', today);
      localStorage.setItem('daily-quote', newQuote);
    }

    loadUpcomingSessions();
  }, []);

  const loadUpcomingSessions = async () => {
    const { data, error } = await supabase
      .from('study_sessions')
      .select(`
        id,
        session_type,
        scheduled_date,
        topics (
          name,
          subjects (
            name
          )
        )
      `)
      .eq('completed', false)
      .gte('scheduled_date', new Date().toISOString().split('T')[0])
      .order('scheduled_date', { ascending: true })
      .limit(5);

    if (!error && data) {
      setUpcomingSessions(data as any);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-r from-primary/10 to-cyan-500/10 border-primary/20">
        <div className="flex items-start gap-4">
          <Lightbulb className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Daily Motivation</h3>
            <p className="text-muted-foreground italic">{quote}</p>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" />
          Upcoming Study Sessions
        </h2>
        
        <div className="space-y-3">
          {upcomingSessions.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">No upcoming sessions. Set up your study plan to get started!</p>
            </Card>
          ) : (
            upcomingSessions.map((session) => (
              <Card key={session.id} className="p-4 hover:shadow-glow transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">{session.topics.subjects.name} - {session.topics.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {session.session_type} Study
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary">
                      {format(new Date(session.scheduled_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { BarChart, Bot, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

interface Topic {
  id: string;
  name: string;
}

export const ProgressView = () => {
  const [completionRate, setCompletionRate] = useState(0);
  const [dailyXP, setDailyXP] = useState<{ date: string; xp: number }[]>([]);
  const [showAssessment, setShowAssessment] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [score, setScore] = useState(50);
  const [confidence, setConfidence] = useState(50);
  
  // AI Chatbot state
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    loadProgressData();
    loadTopics();
  }, []);

  const loadProgressData = async () => {
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('completed');

    if (sessions) {
      const total = sessions.length;
      const completed = sessions.filter(s => s.completed).length;
      setCompletionRate(total > 0 ? Math.round((completed / total) * 100) : 0);
    }

    const last5Days = [];
    for (let i = 4; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { data: logs } = await supabase
        .from('xp_logs')
        .select('amount')
        .gte('created_at', `${dateStr}T00:00:00`)
        .lt('created_at', `${dateStr}T23:59:59`);

      const totalXP = logs?.reduce((sum, log) => sum + log.amount, 0) || 0;
      last5Days.push({ date: format(date, 'MMM dd'), xp: totalXP });
    }
    
    setDailyXP(last5Days);
  };

  const loadTopics = async () => {
    const { data } = await supabase
      .from('topics')
      .select(`
        id,
        name,
        subjects!inner (
          user_id
        )
      `);

    if (data) {
      setTopics(data as any);
    }
  };

  const submitAssessment = async () => {
    if (!selectedTopic) {
      toast.error("Please select a topic");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const xpEarned = 50 + Math.floor(score / 2);

      await supabase.from('assessments').insert({
        topic_id: selectedTopic,
        user_id: user.id,
        score,
        confidence_level: confidence,
        xp_earned: xpEarned
      });

      await supabase.from('xp_logs').insert({
        user_id: user.id,
        amount: xpEarned,
        source: 'Assessment'
      });

      await supabase
        .from('topics')
        .update({ 
          performance_score: score,
          confidence_level: confidence 
        })
        .eq('id', selectedTopic);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('xp')
        .eq('user_id', user.id)
        .single();

      await supabase
        .from('user_profiles')
        .update({ xp: (profile?.xp || 0) + xpEarned })
        .eq('user_id', user.id);

      toast.success(`+${xpEarned} XP earned!`);
      setShowAssessment(false);
      setSelectedTopic("");
      setScore(50);
      setConfidence(50);
      loadProgressData();
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit assessment");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => 
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to get AI response");
    } finally {
      setIsStreaming(false);
    }
  };

  const maxXP = Math.max(...dailyXP.map(d => d.xp), 1);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Overall Completion</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-3" />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <BarChart className="w-5 h-5 text-primary" />
            Daily XP (Last 5 Days)
          </h3>
          <Button onClick={() => setShowAssessment(!showAssessment)} variant="outline" size="sm">
            <ClipboardList className="w-4 h-4 mr-2" />
            Log Assessment
          </Button>
        </div>

        {showAssessment && (
          <Card className="p-4 mb-4 bg-muted/50">
            <h4 className="font-semibold mb-3">Assessment Log</h4>
            <div className="space-y-3">
              <div>
                <Label>Topic</Label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                >
                  <option value="">Select a topic</option>
                  {topics.map(topic => (
                    <option key={topic.id} value={topic.id}>{topic.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Score: {score}%</Label>
                <Input
                  type="range"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Confidence: {confidence}%</Label>
                <Input
                  type="range"
                  min="0"
                  max="100"
                  value={confidence}
                  onChange={(e) => setConfidence(parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
              <Button onClick={submitAssessment} className="w-full">
                Submit Assessment
              </Button>
            </div>
          </Card>
        )}

        <div className="flex items-end gap-2 h-48">
          {dailyXP.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-muted rounded-t relative h-full flex items-end">
                <div
                  className="w-full bg-amber-500 rounded-t transition-all"
                  style={{ height: `${(day.xp / maxXP) * 100}%` }}
                />
              </div>
              <div className="text-xs text-center">
                <div className="font-semibold text-amber-500">{day.xp}</div>
                <div className="text-muted-foreground">{day.date}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          AI Study Tutor
        </h3>
        
        <div className="space-y-4">
          <div className="h-64 overflow-y-auto space-y-3 p-4 bg-muted/50 rounded-lg">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground">Ask me anything about studying!</p>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground ml-8"
                      : "bg-background mr-8"
                  }`}
                >
                  {msg.content}
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Ask a study question..."
              className="resize-none"
              rows={2}
            />
            <Button onClick={sendMessage} disabled={isStreaming}>
              {isStreaming ? "..." : "Send"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

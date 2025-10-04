import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Subject {
  id: string;
  name: string;
  topics: Topic[];
}

interface Topic {
  id: string;
  name: string;
}

export const SetupView = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [dailyHours, setDailyHours] = useState(2);
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .single();

    if (profile) {
      setDailyHours(profile.daily_study_hours || 2);
      setDeadline(profile.deadline_date || "");
    }

    const { data: subjectsData } = await supabase
      .from('subjects')
      .select(`
        id,
        name,
        topics (
          id,
          name
        )
      `);

    if (subjectsData) {
      setSubjects(subjectsData as any);
    }
  };

  const addSubject = () => {
    const newSubject: Subject = {
      id: `temp-${Date.now()}`,
      name: "",
      topics: []
    };
    setSubjects([...subjects, newSubject]);
  };

  const addTopic = (subjectId: string) => {
    setSubjects(subjects.map(s => 
      s.id === subjectId 
        ? { ...s, topics: [...s.topics, { id: `temp-${Date.now()}`, name: "" }] }
        : s
    ));
  };

  const removeSubject = (subjectId: string) => {
    setSubjects(subjects.filter(s => s.id !== subjectId));
  };

  const removeTopic = (subjectId: string, topicId: string) => {
    setSubjects(subjects.map(s =>
      s.id === subjectId
        ? { ...s, topics: s.topics.filter(t => t.id !== topicId) }
        : s
    ));
  };

  const updateSubjectName = (subjectId: string, name: string) => {
    setSubjects(subjects.map(s => s.id === subjectId ? { ...s, name } : s));
  };

  const updateTopicName = (subjectId: string, topicId: string, name: string) => {
    setSubjects(subjects.map(s =>
      s.id === subjectId
        ? { ...s, topics: s.topics.map(t => t.id === topicId ? { ...t, name } : t) }
        : s
    ));
  };

  const saveSetup = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await supabase
        .from('user_profiles')
        .update({
          daily_study_hours: dailyHours,
          deadline_date: deadline || null
        })
        .eq('user_id', user.id);

      const { data: existingSubjects } = await supabase
        .from('subjects')
        .select('id')
        .eq('user_id', user.id);

      const existingIds = existingSubjects?.map(s => s.id) || [];
      await supabase.from('subjects').delete().in('id', existingIds);

      for (const subject of subjects) {
        if (!subject.name.trim()) continue;

        const { data: newSubject } = await supabase
          .from('subjects')
          .insert({ name: subject.name, user_id: user.id })
          .select()
          .single();

        if (newSubject) {
          for (const topic of subject.topics) {
            if (!topic.name.trim()) continue;
            await supabase
              .from('topics')
              .insert({ name: topic.name, subject_id: newSubject.id });
          }
        }
      }

      toast.success("Setup saved successfully!");
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save setup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Study Configuration</h2>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="daily-hours">Daily Study Hours</Label>
            <Input
              id="daily-hours"
              type="number"
              min="1"
              max="16"
              value={dailyHours}
              onChange={(e) => setDailyHours(parseInt(e.target.value))}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="deadline">Deadline Date</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Subjects & Topics</h2>
          <Button onClick={addSubject} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Subject
          </Button>
        </div>

        <div className="space-y-4">
          {subjects.map((subject) => (
            <div key={subject.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Subject name (e.g., Mathematics)"
                  value={subject.name}
                  onChange={(e) => updateSubjectName(subject.id, e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => removeSubject(subject.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="pl-4 space-y-2">
                {subject.topics.map((topic) => (
                  <div key={topic.id} className="flex gap-2">
                    <Input
                      placeholder="Topic name (e.g., Calculus)"
                      value={topic.name}
                      onChange={(e) => updateTopicName(subject.id, topic.id, e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTopic(subject.id, topic.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTopic(subject.id)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Topic
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Button
        onClick={saveSetup}
        disabled={loading}
        className="w-full"
        size="lg"
      >
        {loading ? "Saving..." : "Save Setup"}
      </Button>
    </div>
  );
};

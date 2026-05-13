import { useState } from 'react';
import { Card } from '../components/Cards';
import { Button } from '../components/Buttons';
import { Tag } from '../components/Tags';
import { Plus, Edit, Trash2 } from 'lucide-react';

export function AdminLessons() {
  const [showCreateForm, setShowCreateForm] = useState(false);

  const lessons = [
    {
      id: 1,
      title: 'Pick and Roll Reads - Ball Handler',
      lane: 'player',
      difficulty: 'Intermediate',
      published: true,
      interactions: 5
    },
    {
      id: 2,
      title: 'Zone Defense Principles',
      lane: 'coach',
      difficulty: 'Beginner',
      published: true,
      interactions: 3
    },
    {
      id: 3,
      title: 'Draft Strategy 101',
      lane: 'gm',
      difficulty: 'Beginner',
      published: false,
      interactions: 2
    },
  ];

  return (
    <div className="max-w-screen-xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Manage Lessons</h1>
          <p className="text-muted-foreground">
            Create and edit learning content
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="w-4 h-4" />
          Create Lesson
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <h2 className="mb-4">Create New Lesson</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">Lesson Title</label>
              <input
                type="text"
                placeholder="Enter lesson title..."
                className="w-full px-4 py-2 bg-card border border-border rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">IQ Lane</label>
                <select className="w-full px-4 py-2 bg-card border border-border rounded-lg">
                  <option>Player IQ</option>
                  <option>Coach IQ</option>
                  <option>GM IQ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2">Difficulty</label>
                <select className="w-full px-4 py-2 bg-card border border-border rounded-lg">
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2">Tags</label>
              <input
                type="text"
                placeholder="Add tags (comma separated)..."
                className="w-full px-4 py-2 bg-card border border-border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Lesson Content</label>
              <textarea
                rows={6}
                placeholder="Enter lesson content..."
                className="w-full px-4 py-2 bg-card border border-border rounded-lg resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button className="flex-1">Save & Publish</Button>
              <Button variant="outline" className="flex-1">Save as Draft</Button>
              <Button variant="ghost" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2>All Lessons ({lessons.length})</h2>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-[var(--basketball-orange)]/10 text-[var(--basketball-orange)] rounded text-sm">
              All
            </button>
            <button className="px-3 py-1 bg-muted text-muted-foreground rounded text-sm hover:bg-muted/70">
              Published
            </button>
            <button className="px-3 py-1 bg-muted text-muted-foreground rounded text-sm hover:bg-muted/70">
              Drafts
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4>{lesson.title}</h4>
                  {!lesson.published && (
                    <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-xs rounded">
                      Draft
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Tag variant={lesson.lane as 'player' | 'coach' | 'gm'}>
                    {lesson.lane.toUpperCase()} IQ
                  </Tag>
                  <Tag variant="difficulty" difficulty={lesson.difficulty as 'Beginner' | 'Intermediate' | 'Advanced'}>
                    {lesson.difficulty}
                  </Tag>
                  <span className="text-sm text-muted-foreground">
                    {lesson.interactions} interactions
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline">
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
                <Button size="sm" variant="ghost">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { LessonCard } from '../components/Cards';
import { FilterTags } from '../components/Tags';
import { Search } from 'lucide-react';

export function LearningLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const lanes = ['All', 'Player IQ', 'Coach IQ', 'GM IQ'];
  const difficulties = ['Beginner', 'Intermediate', 'Advanced'];
  const formats = ['Video', 'Interactive', 'Quiz'];

  const allLessons = [
    {
      title: 'Pick and Roll Reads - Ball Handler',
      difficulty: 'Intermediate' as const,
      duration: '8 min',
      tags: ['Player IQ', 'Pick & Roll', 'Decision Making'],
      lane: 'Player IQ'
    },
    {
      title: 'Zone Defense Principles',
      difficulty: 'Beginner' as const,
      duration: '7 min',
      tags: ['Coach IQ', 'Defense', 'Schemes'],
      lane: 'Coach IQ'
    },
    {
      title: 'Draft Strategy 101',
      difficulty: 'Beginner' as const,
      duration: '10 min',
      tags: ['GM IQ', 'Draft', 'Strategy'],
      lane: 'GM IQ'
    },
    {
      title: 'Reading Help Defense Rotations',
      difficulty: 'Intermediate' as const,
      duration: '10 min',
      tags: ['Player IQ', 'Defense', 'Court Vision'],
      lane: 'Player IQ'
    },
    {
      title: 'Small Ball Lineups',
      difficulty: 'Intermediate' as const,
      duration: '9 min',
      tags: ['Coach IQ', 'Lineups', 'Strategy'],
      lane: 'Coach IQ'
    },
    {
      title: 'Evaluating Wing Prospects',
      difficulty: 'Intermediate' as const,
      duration: '12 min',
      tags: ['GM IQ', 'Scouting', 'Evaluation'],
      lane: 'GM IQ'
    },
    {
      title: 'Corner Pin Reads',
      difficulty: 'Advanced' as const,
      duration: '12 min',
      tags: ['Player IQ', 'Advanced', 'Reads'],
      lane: 'Player IQ'
    },
    {
      title: 'Late Game Situations',
      difficulty: 'Advanced' as const,
      duration: '11 min',
      tags: ['Coach IQ', 'Clutch', 'Strategy'],
      lane: 'Coach IQ'
    },
    {
      title: 'Building Around a Star',
      difficulty: 'Advanced' as const,
      duration: '15 min',
      tags: ['GM IQ', 'Roster', 'Construction'],
      lane: 'GM IQ'
    }
  ];

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const filteredLessons = allLessons.filter(lesson => {
    const matchesSearch = searchQuery === '' ||
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilters = activeFilters.length === 0 ||
      activeFilters.some(filter =>
        lesson.tags.includes(filter) ||
        lesson.difficulty === filter ||
        lesson.lane === filter ||
        filter === 'All'
      );

    return matchesSearch && matchesFilters;
  });

  return (
    <div className="max-w-screen-xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="mb-2">Learning Library</h1>
        <p className="text-muted-foreground">
          Browse all lessons across Player, Coach, and GM IQ tracks
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search lessons, concepts, tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm mb-2">IQ Lane</h3>
          <FilterTags tags={lanes} activeFilters={activeFilters} onToggle={toggleFilter} />
        </div>

        <div>
          <h3 className="text-sm mb-2">Difficulty</h3>
          <FilterTags tags={difficulties} activeFilters={activeFilters} onToggle={toggleFilter} />
        </div>

        <div>
          <h3 className="text-sm mb-2">Format</h3>
          <FilterTags tags={formats} activeFilters={activeFilters} onToggle={toggleFilter} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-muted-foreground">
            {filteredLessons.length} {filteredLessons.length === 1 ? 'lesson' : 'lessons'}
          </p>
          {activeFilters.length > 0 && (
            <button
              onClick={() => setActiveFilters([])}
              className="text-sm text-[var(--basketball-orange)] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLessons.map((lesson, i) => (
            <LessonCard
              key={i}
              title={lesson.title}
              difficulty={lesson.difficulty}
              duration={lesson.duration}
              tags={lesson.tags}
              onClick={() => console.log('Lesson clicked:', lesson.title)}
            />
          ))}
        </div>

        {filteredLessons.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No lessons found matching your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

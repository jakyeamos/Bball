import React from 'react';
import { LessonRecord } from '@nba-draft-sim/shared';
import { Link } from 'react-router-dom';
import { LessonMeta } from './LessonMeta';
import { Card } from '../Card';

interface LessonCardProps {
  lesson: LessonRecord;
}

export function LessonCard({ lesson }: LessonCardProps) {
  return (
    <Card padding="none" className="relative overflow-hidden bg-cv-steel border border-cv-court/30 hover:border-cv-court transition-colors flex flex-col group h-full">
      {lesson.media_url ? (
        <div className="aspect-video w-full overflow-hidden bg-cv-navy">
          <img 
            src={lesson.media_url} 
            alt={lesson.title} 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-video w-full flex items-center justify-center bg-cv-navy/50">
          <span className="text-cv-chalk/20 text-sm">No Media</span>
        </div>
      )}
      <div className="p-6 flex flex-col flex-1">
        <div className="mb-3">
           <LessonMeta 
             roleLens={lesson.role_lens} 
             difficulty={lesson.difficulty} 
             interactionType={lesson.interaction_type} 
           />
        </div>
        <h3 className="text-cv-chalk text-xl font-semibold mb-2 group-hover:text-cv-accent transition-colors">
          <Link to={`/lessons/${lesson.id}`} className="absolute inset-0 z-10">
             <span className="sr-only">View {lesson.title}</span>
          </Link>
          {lesson.title}
        </h3>
        {lesson.takeaway && (
          <p className="text-cv-chalk/80 text-sm mb-4 font-medium italic">
            "{lesson.takeaway}"
          </p>
        )}
        <p className="text-cv-chalk/60 text-sm leading-relaxed mb-4 line-clamp-2">
          {lesson.description}
        </p>
        <div className="mt-auto pt-4 border-t border-cv-court/20" style={{ position: 'relative', zIndex: 2 }}>
           <span className="text-sm font-semibold text-cv-accent group-hover:text-orange-500 transition-colors pointer-events-none">
             Start Lesson →
           </span>
        </div>
      </div>
    </Card>
  );
}

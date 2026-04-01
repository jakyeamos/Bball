import lessonsSeed from '../data/lessons-seed.json';
import { updateStore } from '../src/lib/courtVisionStore';
import { LessonRecord } from '../../shared/schemas';

async function main() {
  const lessons = lessonsSeed as LessonRecord[];

  await updateStore((store) => {
    store.lessons = lessons;
    const nextTags = new Set(store.tags);
    lessons.forEach((lesson) => lesson.tags?.forEach((tag) => nextTags.add(tag)));
    store.tags = [...nextTags].sort((a, b) => a.localeCompare(b));
  });

  console.log(`Seeded ${lessons.length} Court Vision lessons.`);
}

main().catch((error) => {
  console.error('Failed to seed lessons:', error);
  process.exit(1);
});

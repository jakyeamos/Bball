import { Request, Response, Router } from 'express';
import { updateStore } from '../lib/courtVisionStore';
import { getRequestUserId } from '../lib/requestIdentity';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = getRequestUserId(req);
  const friends = await updateStore((store) => {
    const existing = store.friends_by_user[userId];
    if (existing && existing.length > 0) {
      return existing;
    }

    const seeded = [
      { friend_id: 'friend-film-room', display_name: 'Film Room Fran' },
      { friend_id: 'friend-bench-unit', display_name: 'Bench Unit Ben' },
      { friend_id: 'friend-front-office', display_name: 'Front Office Kai' },
    ];
    store.friends_by_user[userId] = seeded;
    return seeded;
  });

  res.json({ friends });
});

export default router;

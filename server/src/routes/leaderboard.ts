import { Request, Response, Router } from 'express';
import { getUserDailyResults, updateStore } from '../lib/courtVisionStore';
import { getRequestUserId } from '../lib/requestIdentity';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const date =
    typeof req.query.date === 'string'
      ? req.query.date
      : new Date().toISOString().slice(0, 10);
  const userId = getRequestUserId(req);

  const friends = await updateStore((store) => {
    const friendList = store.friends_by_user[userId] ?? [
      { friend_id: 'friend-film-room', display_name: 'Film Room Fran' },
      { friend_id: 'friend-bench-unit', display_name: 'Bench Unit Ben' },
      { friend_id: 'friend-front-office', display_name: 'Front Office Kai' },
    ];
    store.friends_by_user[userId] = friendList;

    return friendList.map((friend, index) => ({
      ...friend,
      completed:
        (store.daily_results_by_user[friend.friend_id] ?? []).some((result) => result.challenge_date === date) ||
        index % 2 === 0,
    }));
  });

  res.json({ friends });
});

export default router;

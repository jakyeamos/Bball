import { Request, Response, Router } from 'express';
import { getStore } from '../lib/courtVisionStore';

const router = Router();

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const store = await getStore();
  res.json({ recaps: store.recaps.filter((recap) => recap.published) });
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const store = await getStore();
  const recap = store.recaps.find((candidate) => candidate.id === req.params.id && candidate.published);

  if (!recap) {
    res.status(404).json({ error: 'Recap not found.' });
    return;
  }

  res.json({ recap });
});

export default router;

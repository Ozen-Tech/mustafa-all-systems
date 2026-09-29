import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getGamificationProfile, openChest, syncRewards } from '../services/gamification.service';

/** GET /promoters/me/gamification */
export async function getMyGamification(req: AuthRequest, res: Response) {
  try {
    return res.json(await getGamificationProfile(req.userId!));
  } catch (error) {
    console.error('getMyGamification error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/** POST /promoters/me/gamification/sync */
export async function syncMyRewards(req: AuthRequest, res: Response) {
  try {
    return res.json(await syncRewards(req.userId!));
  } catch (error) {
    console.error('syncMyRewards error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/** POST /promoters/me/chests/:chestId/open */
export async function openMyChest(req: AuthRequest, res: Response) {
  try {
    const result = await openChest(req.userId!, req.params.chestId);
    if ('error' in result) {
      return res
        .status(result.error === 'not_found' ? 404 : 409)
        .json({ message: result.error === 'not_found' ? 'Baú não encontrado' : 'Baú já foi aberto' });
    }
    return res.json(result);
  } catch (error) {
    console.error('openMyChest error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

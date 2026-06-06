import { Router } from 'express';
import { searchGooglePlaces } from '../controllers/searchController.js';

const router = Router();

router.post('/google-places', searchGooglePlaces);

export default router;

import { Router } from 'express';
import { getLeads, getLead, createLead, bulkCreateLeads, updateLead, deleteLead, getStats } from '../controllers/leadController.js';

const router = Router();

router.get('/', getLeads);
router.get('/stats', getStats);
router.get('/:id', getLead);
router.post('/', createLead);
router.post('/bulk', bulkCreateLeads);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);

export default router;

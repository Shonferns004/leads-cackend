import { Router } from 'express';
import { sendMessage, sendBulk, handleWebhook, getMessages } from '../controllers/whatsappController.js';

const router = Router();

router.post('/send', sendMessage);
router.post('/send-bulk', sendBulk);
router.get('/messages', getMessages);
router.all('/webhook', handleWebhook);

export default router;

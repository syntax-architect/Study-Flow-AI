import { Router } from 'express';
import { 
  getUserChats, createChat, getChatMessages, 
  getUserMastery, getCohortAnalytics, getPersonalCohortAnalytics, getRecommendations,
  deleteChat, deleteAllUserChats, renameChat, toggleMessagePin, flagForReview, toggleChatPin,
  getReviewQueue, resolveReview, getFlaggedStudents
} from '../controllers/db.controller';

const router = Router();

router.get('/chats/user/:userId', getUserChats);
router.post('/chats', createChat);
router.get('/chats/:chatId/messages', getChatMessages);
router.delete('/chats/:chatId', deleteChat);
router.delete('/chats/user/:userId', deleteAllUserChats);
router.patch('/chats/:chatId', renameChat);
router.patch('/chats/:chatId/pin', toggleChatPin);
router.patch('/messages/:messageId/pin', toggleMessagePin);
router.get('/mastery/:userId', getUserMastery);
router.get('/analytics/cohorts/me', getPersonalCohortAnalytics);
router.get('/analytics/cohorts', getCohortAnalytics);
router.get('/recommendations/:userId', getRecommendations);
router.post('/flag-for-review', flagForReview);
router.get('/review-queue', getReviewQueue);
router.post('/review-queue/:reviewId/resolve', resolveReview);
router.get('/intervention/flagged-students', getFlaggedStudents);

export default router;

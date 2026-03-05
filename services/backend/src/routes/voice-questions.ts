import { FastifyInstance } from 'fastify';
import { VoiceQuestionRepository } from '../db/voice-question.repository';
import { requireAuth } from '../middleware/auth';

export async function registerVoiceQuestionsRoutes(app: FastifyInstance) {
  // Get voice questions by test
  app.get<{ Params: { testId: string } }>(
    '/tests/:testId/voice-questions',
    async (request, reply) => {
      const { testId } = request.params;
      const questions = await VoiceQuestionRepository.findVoiceQuestionsByTest(parseInt(testId));
      reply.send(questions);
    }
  );

  // Get single voice question
  app.get<{ Params: { voiceQuestionId: string } }>(
    '/voice-questions/:voiceQuestionId',
    async (request, reply) => {
      const { voiceQuestionId } = request.params;
      const question = await VoiceQuestionRepository.findVoiceQuestionById(parseInt(voiceQuestionId));
      if (!question) {
        reply.code(404).send({ error: 'Voice question not found' });
        return;
      }
      reply.send(question);
    }
  );

  // Record voice answer - protected
  app.post<{ Params: { voiceQuestionId: string }; Body: any }>(
    '/voice-questions/:voiceQuestionId/answer',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const { voiceQuestionId } = request.params;
      const { voiceAnswerUrl, answerText, durationSeconds } = request.body;
      const userId = (request as any).userId;

      if (!voiceAnswerUrl || !answerText || !durationSeconds) {
        reply.code(400).send({ error: 'Missing required fields' });
        return;
      }

      const answer = await VoiceQuestionRepository.recordVoiceAnswer(
        userId,
        parseInt(voiceQuestionId),
        voiceAnswerUrl,
        answerText,
        durationSeconds
      );
      reply.code(201).send(answer);
    }
  );

  // Update voice answer with transcription result - protected
  app.put<{ Params: { voiceAnswerId: string }; Body: any }>(
    '/voice-answers/:voiceAnswerId/transcribe',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const { voiceAnswerId } = request.params;
      const { recognizedText, accuracyPercent, originalText, transcribedText, confidenceScore } = request.body;

      const answer = await VoiceQuestionRepository.updateVoiceAnswerAccuracy(
        parseInt(voiceAnswerId),
        recognizedText,
        accuracyPercent
      );

      // Save transcription details
      if (originalText && transcribedText && confidenceScore !== undefined) {
        await VoiceQuestionRepository.recordTranscription(
          parseInt(voiceAnswerId),
          originalText,
          transcribedText,
          confidenceScore
        );
      }

      reply.send(answer);
    }
  );

  // Get voice transcription - protected
  app.get<{ Params: { voiceAnswerId: string } }>(
    '/voice-answers/:voiceAnswerId/transcription',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const { voiceAnswerId } = request.params;
      const transcription = await VoiceQuestionRepository.getTranscription(parseInt(voiceAnswerId));
      if (!transcription) {
        reply.code(404).send({ error: 'Transcription not found' });
        return;
      }
      reply.send(transcription);
    }
  );

  // Get user's voice answers - protected
  app.get(
    '/user/voice-answers',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const userId = (request as any).userId;
      const limit = parseInt(request.query?.limit as string) || 50;
      const answers = await VoiceQuestionRepository.getUserVoiceAnswers(userId, limit);
      reply.send(answers);
    }
  );

  // Get voice answer analytics - protected
  app.get(
    '/user/voice-analytics',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const userId = (request as any).userId;
      const analytics = await VoiceQuestionRepository.getVoiceAnswerAnalytics(userId);
      reply.send(analytics);
    }
  );

  // Get test voice performance - protected
  app.get<{ Params: { testId: string } }>(
    '/tests/:testId/voice-performance',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const { testId } = request.params;
      const userId = (request as any).userId;
      const performance = await VoiceQuestionRepository.getTestVoicePerformance(
        parseInt(testId),
        userId
      );
      reply.send(performance);
    }
  );

  // Admin: Create voice question
  app.post<{ Body: any }>(
    '/admin/voice-questions',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const { testId, questionId, voicePromptUrl, durationSeconds, language } = request.body;
      const question = await VoiceQuestionRepository.createVoiceQuestion(
        testId,
        questionId,
        voicePromptUrl,
        durationSeconds,
        language
      );
      reply.code(201).send(question);
    }
  );

  // Admin: Delete voice question
  app.delete<{ Params: { voiceQuestionId: string } }>(
    '/admin/voice-questions/:voiceQuestionId',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      const { voiceQuestionId } = request.params;
      const deleted = await VoiceQuestionRepository.deleteVoiceQuestion(parseInt(voiceQuestionId));
      if (deleted) {
        reply.send({ success: true });
      } else {
        reply.code(404).send({ error: 'Voice question not found' });
      }
    }
  );
}

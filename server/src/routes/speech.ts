/**
 * 语音交互路由
 * POST /api/speech/tts - 文本转语音
 * POST /api/speech/stt - 语音转文本
 */

import { Router, Request, Response } from 'express';
import { speechService } from '../services/speechService';
import { asyncHandler, AppError, ValidationError } from '../middleware/errorHandler';

const router: Router = Router();

/**
 * 文本转语音（TTS）
 * 将文字转换为语音，支持多种语音类型
 */
router.post(
  '/tts',
  asyncHandler(async (req: Request, res: Response) => {
    const { text, voice } = req.body;

    // 输入验证
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new ValidationError('请输入需要转换的文本');
    }

    if (text.length > 5000) {
      throw new ValidationError('文本过长（最多 5000 字符）');
    }

    // 语音类型验证（可选）
    const validVoices = ['low', 'medium', 'high', 'children', 'emotional'];
    if (voice !== undefined && !validVoices.includes(voice)) {
      throw new ValidationError(`不支持的语音类型：${voice}，可选值：${validVoices.join(', ')}`);
    }

    // 调用 TTS 服务
    const result = await speechService.textToSpeech(text, voice || 'medium');

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * 语音转文本（STT/ASR）
 * 将音频转换为文字
 */
router.post(
  '/stt',
  asyncHandler(async (req: Request, res: Response) => {
    const { audio } = req.body;

    // 输入验证
    if (!audio || typeof audio !== 'string') {
      throw new ValidationError('请输入音频数据（Base64 编码）');
    }

    // 调用 ASR 服务
    const result = await speechService.speechToText(audio);

    res.json({
      success: true,
      data: result,
    });
  })
);

export default router;

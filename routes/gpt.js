const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// 명령어 처리 함수
const processCommand = async (command, userId) => {
  if (command.includes('이벤트 신청')) {
    return {
      type: 'EVENT_APPLY',
      action: 'apply',
      message: '이벤트 신청을 진행하겠습니다. 이벤트 ID가 필요합니다.'
    };
  }
  // 다른 명령어들 추가 가능
  return null;
};

router.post('/command', authenticateToken, async (req, res) => {
  try {
    const { command } = req.body;
    
    // GPT API 호출
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "당신은 이벤트 관리 시스템의 도우미입니다. 사용자의 요청을 이해하고 적절한 작업을 제안해주세요."
        },
        {
          role: "user",
          content: command
        }
      ],
    });

    // 명령어 처리
    const action = await processCommand(command, req.user.id);

    res.json({
      gptResponse: completion.data.choices[0].message.content,
      action: action
    });
  } catch (error) {
    console.error('GPT command error:', error);
    res.status(500).json({ message: 'Error processing command' });
  }
});

module.exports = router;

// import { GoogleGenAI } from '@google/genai'; // 可以删除这行，不再使用

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('[Gemini] 未配置 GEMINI_API_KEY 环境变量');
}

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { model, prompt, temperature, apiKey } = req.body;

  // 优先使用 Vercel 环境变量
  const effectiveApiKey = GEMINI_API_KEY || apiKey;

  if (!effectiveApiKey) {
    return res.status(500).json({
      success: false,
      error: '未配置 Gemini API Key'
    });
  }

  try {
    // 改用 fetch 访问 API 易的 OpenAI 兼容接口
    const response = await fetch('https://api.apiyi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${effectiveApiKey}`
      },
      body: JSON.stringify({
        model: model || 'gemini-2.5-flash', // 保持模型名一致
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: temperature || 0.7
        // 注意：OpenAI 格式的 tools 参数与 Gemini 不同，这里暂时移除 googleSearch 工具
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    return res.json({
      success: true,
      text: data.choices[0].message.content || ''
    });
  } catch (error) {
    console.error('[Gemini] 请求失败:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // JSON parser with sufficient limit for base64 file uploads
  app.use(express.json({ limit: '25mb' }));

  // Server-side Gemini client setup with User-Agent telemetry
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', hasApiKey: !!apiKey });
  });

  // AI Route: Generate quiz questions based on topic, grade, count, difficulty, and optionsCount (2 or 4)
  app.post('/api/ai/generate-questions', async (req, res) => {
    try {
      const { topic, count = 5, difficulty = 'Vừa phải', grade = 'Tiểu học', optionsCount = 4 } = req.body;
      if (!topic || typeof topic !== 'string') {
        return res.status(400).json({ error: 'Vui lòng cung cấp chủ đề câu hỏi' });
      }

      const numCount = Math.min(Math.max(parseInt(count, 10) || 5, 2), 15);
      const is4Options = parseInt(optionsCount, 10) === 4 || optionsCount === '4';
      const expectedOptionsCount = is4Options ? 4 : 2;

      // Ultra-concise prompt to minimize token output time for maximum speed
      const prompt = `Bạn là Ms Mèo. Hãy tạo nhanh bộ câu hỏi trắc nghiệm gồm ${numCount} câu bằng tiếng Việt về: "${topic}".
Đối tượng: ${grade}. Độ khó: ${difficulty}.

YÊU CẦU TỐC ĐỘ CAO & CHUẨN XÁC:
1. Mỗi câu có ĐÚNG ${expectedOptionsCount} lựa chọn (${is4Options ? 'A, B, C, D khớp cử chỉ 1-2-3-4 ngón tay' : 'A, B'}).
2. correctIndex là số từ 0 đến ${expectedOptionsCount - 1}.
3. Câu hỏi và đáp án phải ngắn gọn, súc tích (dưới 15 chữ), dễ hiểu và có emoji sinh động.
4. Lời giải thích cực ngắn (dưới 12 chữ). Trả về JSON chuẩn ngay lập tức.`;

      let response: any = null;
      // gemini-3.8-flash is primary, fallback to gemini-3.1-flash-lite or gemini-flash-latest
      const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      let lastErr: any = null;

      for (const modelName of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction: `Bạn là trợ lý Ms Mèo tạo trắc nghiệm ${expectedOptionsCount} đáp án siêu tốc, ngắn gọn, hấp dẫn cho học sinh.`,
              responseMimeType: 'application/json',
              temperature: 0.6,
              maxOutputTokens: 1200,
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'Tên bộ câu hỏi ngắn gọn' },
                  description: { type: Type.STRING, description: 'Mô tả ngắn gọn' },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        question: { type: Type.STRING, description: 'Câu hỏi ngắn gọn' },
                        options: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          minItems: expectedOptionsCount,
                          maxItems: expectedOptionsCount,
                          description: `Đúng ${expectedOptionsCount} đáp án ngắn gọn`
                        },
                        correctIndex: { type: Type.INTEGER, description: `Chỉ số đáp án đúng (0 đến ${expectedOptionsCount - 1})` },
                        explanation: { type: Type.STRING, description: 'Giải thích ngắn dưới 12 chữ' }
                      },
                      required: ['question', 'options', 'correctIndex']
                    }
                  }
                },
                required: ['title', 'questions']
              }
            }
          });
          if (response?.text) break;
        } catch (mErr: any) {
          console.warn(`Attempt with ${modelName} encountered:`, mErr?.message || mErr);
          lastErr = mErr;
        }
      }

      if (!response?.text) {
        throw lastErr || new Error('Không nhận được phản hồi từ AI');
      }

      const text = response.text;
      const parsed = JSON.parse(text);
      const validQuestions = (parsed.questions || []).map((q: any, i: number) => ({
        id: Date.now() + i,
        question: q.question,
        options: Array.isArray(q.options) && q.options.length >= expectedOptionsCount
          ? q.options.slice(0, expectedOptionsCount).map(String)
          : is4Options ? ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'] : ['Đúng', 'Sai'],
        correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < expectedOptionsCount 
          ? q.correctIndex 
          : 0,
        explanation: q.explanation || ''
      }));

      res.json({
        title: parsed.title || `Bộ câu hỏi: ${topic}`,
        description: parsed.description || '',
        questions: validQuestions
      });
    } catch (err: any) {
      console.error('Lỗi khi tạo câu hỏi với AI:', err);
      res.status(500).json({ error: err.message || 'Lỗi khi gọi AI Gemini tạo câu hỏi' });
    }
  });

  // AI Route: Parse pasted raw text into quiz questions (Copy-paste from external documents)
  app.post('/api/ai/parse-text', async (req, res) => {
    try {
      const { text, optionsCount = 4, title } = req.body;
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: 'Vui lòng dán nội dung văn bản hoặc đề thi' });
      }

      const is4Options = parseInt(optionsCount, 10) === 4 || optionsCount === '4';
      const expectedOptionsCount = is4Options ? 4 : 2;

      const prompt = `Trích xuất siêu tốc các câu hỏi trắc nghiệm từ văn bản/đề thi sau:
${text}

QUY TẮC:
1. Mỗi câu có ĐÚNG ${expectedOptionsCount} lựa chọn (${is4Options ? 'A, B, C, D' : 'A, B'}).
2. Giữ câu hỏi và đáp án súc tích.
3. Xác định correctIndex (0=A, 1=B, 2=C, 3=D). Nếu có 'Đáp án: X' hoặc gạch chân/ký hiệu thì lấy theo đó.
4. Trả về JSON rút gọn nhanh nhất.`;

      let response: any = null;
      const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      let lastErr: any = null;

      for (const modelName of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction: `Bạn là trợ lý Ms Mèo phân tích đề thi sang trắc nghiệm ${expectedOptionsCount} lựa chọn tốc độ cao.`,
              responseMimeType: 'application/json',
              temperature: 0.5,
              maxOutputTokens: 1200,
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'Tiêu đề ngắn' },
                  description: { type: Type.STRING, description: 'Mô tả ngắn' },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        question: { type: Type.STRING, description: 'Nội dung câu hỏi' },
                        options: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          minItems: expectedOptionsCount,
                          maxItems: expectedOptionsCount,
                          description: `Mảng ${expectedOptionsCount} đáp án`
                        },
                        correctIndex: { type: Type.INTEGER, description: `Chỉ số đáp án đúng (0 đến ${expectedOptionsCount - 1})` },
                        explanation: { type: Type.STRING, description: 'Giải thích cực ngắn' }
                      },
                      required: ['question', 'options', 'correctIndex']
                    }
                  }
                },
                required: ['questions']
              }
            }
          });
          if (response?.text) break;
        } catch (mErr: any) {
          console.warn(`Attempt with ${modelName} encountered:`, mErr?.message || mErr);
          lastErr = mErr;
        }
      }

      if (!response?.text) throw lastErr || new Error('Không nhận được phản hồi từ AI');

      const textResp = response.text;
      const parsed = JSON.parse(textResp);
      const validQuestions = (parsed.questions || []).map((q: any, i: number) => ({
        id: Date.now() + i,
        question: q.question,
        options: Array.isArray(q.options) && q.options.length >= expectedOptionsCount
          ? q.options.slice(0, expectedOptionsCount).map(String)
          : is4Options ? ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'] : ['Đúng', 'Sai'],
        correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < expectedOptionsCount 
          ? q.correctIndex 
          : 0,
        explanation: q.explanation || ''
      }));

      res.json({
        title: title || parsed.title || 'Bộ câu hỏi từ văn bản dán',
        description: parsed.description || 'Trích xuất tự động từ văn bản bởi Ms Mèo AI',
        questions: validQuestions
      });
    } catch (err: any) {
      console.error('Lỗi khi phân tích văn bản:', err);
      res.status(500).json({ error: err.message || 'Lỗi khi phân tích văn bản đề thi' });
    }
  });

  // AI Route: Parse file content into quiz questions
  app.post('/api/ai/parse-file', async (req, res) => {
    try {
      const { textContent, base64Data, mimeType, optionsCount = 4 } = req.body;
      const is4Options = parseInt(optionsCount, 10) === 4 || optionsCount === '4';
      const expectedOptionsCount = is4Options ? 4 : 2;

      const prompt = `Trích xuất các câu hỏi trắc nghiệm từ tài liệu này.
QUY TẮC BẮT BUỘC:
- Mỗi câu hỏi PHẢI có ĐÚNG ${expectedOptionsCount} đáp án (${is4Options ? 'A, B, C, D' : 'A, B'}).
- Trong tệp nguồn, đáp án đúng thường được đánh dấu bằng ký hiệu '#' ở phía trước hoặc in đậm/gạch chân. Nếu không có ký hiệu, hãy xác định đáp án đúng chính xác nhất.
- correctIndex: 0 cho A, 1 cho B, 2 cho C, 3 cho D.
- Trả về danh sách mảng JSON. Hãy đảm bảo nội dung bằng tiếng Việt.`;

      let contents: any;
      if (base64Data && mimeType) {
        contents = {
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64Data } }
          ]
        };
      } else if (textContent) {
        contents = {
          parts: [
            { text: `${prompt}\n\nNội dung tệp:\n${textContent}` }
          ]
        };
      } else {
        return res.status(400).json({ error: 'Không có dữ liệu tệp được gửi lên' });
      }

      let response: any = null;
      const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      let lastErr: any = null;

      for (const modelName of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      minItems: expectedOptionsCount,
                      maxItems: expectedOptionsCount,
                      description: `Mảng chứa đúng ${expectedOptionsCount} lựa chọn đáp án.`
                    },
                    correctIndex: { type: Type.INTEGER, description: `Chỉ số của đáp án đúng (0 đến ${expectedOptionsCount - 1}).` }
                  },
                  required: ['question', 'options', 'correctIndex']
                }
              }
            }
          });
          if (response?.text) break;
        } catch (mErr: any) {
          console.warn(`File parse attempt with ${modelName} encountered:`, mErr?.message || mErr);
          lastErr = mErr;
        }
      }

      if (!response?.text) throw lastErr || new Error('Không nhận được phản hồi từ AI');
      const text = response.text;
      const questionsRaw = JSON.parse(text);
      res.json({ questions: questionsRaw });
    } catch (err: any) {
      console.error('Lỗi khi trích xuất câu hỏi từ tệp:', err);
      res.status(500).json({ error: err.message || 'Lỗi khi trích xuất tài liệu' });
    }
  });

  // Serve static files in production or Vite in development
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ms Mèo Fullstack server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

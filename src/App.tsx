import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  FaceLandmarker, 
  HandLandmarker, 
  FilesetResolver,
  FaceLandmarkerResult,
  HandLandmarkerResult
} from '@mediapipe/tasks-vision';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Trophy, 
  RefreshCcw, 
  Hand, 
  Smile, 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  Heart, 
  Star, 
  Sparkles, 
  Music, 
  Upload, 
  Loader2, 
  Share2, 
  BookOpen, 
  Home, 
  GraduationCap, 
  Eye, 
  EyeOff, 
  Check, 
  List, 
  Gamepad2, 
  Play, 
  ArrowLeft, 
  ArrowRight,
  Volume2,
  VolumeX,
  Wand2,
  Sliders,
  X,
  RefreshCw,
  Flame,
  Edit3,
  ClipboardPaste,
  HelpCircle,
  FileText,
  Timer,
  Zap,
  Award,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import mammoth from 'mammoth';

// --- TYPES ---
export type Question = {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  image?: string;
  explanation?: string;
};

export type QuestionSet = {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  createdAt: number;
};

export type GameState = 
  | 'START' 
  | 'LIBRARY' 
  | 'PLAYING' 
  | 'RESULT' 
  | 'FINISHED' 
  | 'EDITING' 
  | 'CERTIFICATE' 
  | 'DETAILS' 
  | 'PRACTICE';

export interface AppSettings {
  // Camera
  cameraDeviceId: string;
  mirrorCamera: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  showGestureHints: boolean;
  // Audio
  musicEnabled: boolean;
  musicVolume: number;
  sfxEnabled: boolean;
  sfxVolume: number;
  // Visuals
  enableFireworks: boolean;
  floatingElements: boolean;
  // Timed Mode
  timePerQuestion: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  cameraDeviceId: '',
  mirrorCamera: true,
  sensitivity: 'medium',
  showGestureHints: true,
  musicEnabled: true,
  musicVolume: 50,
  sfxEnabled: true,
  sfxVolume: 80,
  enableFireworks: true,
  floatingElements: true,
  timePerQuestion: 15,
};

const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 1,
    question: "Con mèo thường kêu thế nào?",
    options: ["Gâu Gâu 🐶", "Meo Meo 🐱", "Cục Tác 🐔", "Ụt Ịt 🐷"],
    correctIndex: 1,
    explanation: "Mèo con luôn kêu Meo Meo nũng nịu thật đáng yêu!"
  },
  {
    id: 2,
    question: "Mặt trời mọc ở hướng nào vào buổi sáng?",
    options: ["Hướng Đông 🌅", "Hướng Tây 🌇", "Hướng Nam 🧭", "Hướng Bắc ❄️"],
    correctIndex: 0,
    explanation: "Mặt Trời luôn mọc ở hướng Đông và lặn ở hướng Tây!"
  },
  {
    id: 3,
    question: "Thủ đô của nước Việt Nam là thành phố nào?",
    options: ["TP. Hồ Chí Minh", "Đà Nẵng", "Hà Nội 🏛️", "Hải Phòng"],
    correctIndex: 2,
    explanation: "Hà Nội là thủ đô ngàn năm văn hiến của đất nước Việt Nam!"
  },
  {
    id: 4,
    question: "Một tuần lễ có bao nhiêu ngày?",
    options: ["5 ngày", "6 ngày", "7 ngày 📅", "8 ngày"],
    correctIndex: 2,
    explanation: "Một tuần gồm có 7 ngày từ Thứ Hai đến Chủ Nhật!"
  }
];

const INITIAL_SET: QuestionSet = {
  id: 'default',
  title: 'Bộ câu hỏi Ms Mèo 4 đáp án',
  description: 'Những câu hỏi vui nhộn khám phá thế giới xung quanh với cử chỉ 4 ngón tay',
  questions: DEFAULT_QUESTIONS,
  createdAt: Date.now()
};

export interface InstantTemplate {
  id: string;
  badge: string;
  title: string;
  category: string;
  description: string;
  icon: string;
  questions: Question[];
}

export const INSTANT_TEMPLATES: InstantTemplate[] = [
  {
    id: 'tpl_animals',
    badge: '🐾 Phổ biến nhất',
    title: 'Thế Giới Động Vật Kỳ Diệu',
    category: 'Sinh học & Tự nhiên',
    description: 'Khám phá thế giới loài vật siêu đáng yêu với 4 cử chỉ ngón tay',
    icon: '🐱',
    questions: [
      {
        id: 101,
        question: "Loài vật nào được mệnh danh là 'Chúa sơn lâm'?",
        options: ["Hổ vằn 🐯", "Sư tử 🦁", "Báo đốm 🐆", "Gấu nâu 🐻"],
        correctIndex: 0,
        explanation: "Hổ vằn dũng mãnh là chúa tể rừng xanh!"
      },
      {
        id: 102,
        question: "Con vật nào biết bay và ngủ treo ngược cành cây?",
        options: ["Chim cánh cụt 🐧", "Con dơi 🦇", "Sóc bay 🐿️", "Bướm đêm 🦋"],
        correctIndex: 1,
        explanation: "Dơi là loài thú có vú duy nhất biết bay lượn!"
      },
      {
        id: 103,
        question: "Thức ăn ưa thích nhất của gấu trúc Panda là gì?",
        options: ["Chuối chín 🍌", "Cỏ non 🌿", "Cây trúc tre 🎋", "Mật ong rừng 🍯"],
        correctIndex: 2,
        explanation: "Gấu trúc Panda cực kỳ thích ăn lá và thân cây trúc non!"
      },
      {
        id: 104,
        question: "Loài chim nào không biết bay nhưng bơi lội cực giỏi?",
        options: ["Chim cánh cụt 🐧", "Đại bàng 🦅", "Bồ nông 🦤", "Thiên nga 🦢"],
        correctIndex: 0,
        explanation: "Chim cánh cụt bơi và lặn dưới nước băng tuyết rất tài tình!"
      },
      {
        id: 105,
        question: "Loài vật nào có chiếc cổ dài nhất thế giới?",
        options: ["Voi rừng 🐘", "Ngựa vằn 🦓", "Hươu cao cổ 🦒", "Lạc đà 🐪"],
        correctIndex: 2,
        explanation: "Hươu cao cổ có chiếc cổ dài giúp với tới lá cây trên cao!"
      }
    ]
  },
  {
    id: 'tpl_math',
    badge: '⚡ Tính siêu nhanh',
    title: 'Toán Vui Tính Nhanh',
    category: 'Toán học Tiểu học',
    description: 'Thử thách phản xạ tính nhẩm nhanh và hình học vui',
    icon: '🔢',
    questions: [
      {
        id: 201,
        question: "25 + 17 bằng bao nhiêu?",
        options: ["32", "42 ✨", "44", "52"],
        correctIndex: 1,
        explanation: "25 + 17 = 42 chính xác rồi bạn ơi!"
      },
      {
        id: 202,
        question: "Hình vuông có bao nhiêu cạnh bằng nhau?",
        options: ["3 cạnh", "5 cạnh", "4 cạnh 🔲", "6 cạnh"],
        correctIndex: 2,
        explanation: "Hình vuông có 4 cạnh bằng nhau và 4 góc vuông!"
      },
      {
        id: 203,
        question: "Một tá bút chì gồm có bao nhiêu chiếc?",
        options: ["10 chiếc", "12 chiếc ✏️", "15 chiếc", "20 chiếc"],
        correctIndex: 1,
        explanation: "Một tá theo quy ước dân gian là 12 chiếc!"
      },
      {
        id: 204,
        question: "Số lớn nhất có một chữ số là số nào?",
        options: ["7", "8", "9 🌟", "10"],
        correctIndex: 2,
        explanation: "Số 9 là số có 1 chữ số lớn nhất trong toán học!"
      },
      {
        id: 205,
        question: "Tích của 8 nhân 5 bằng bao nhiêu?",
        options: ["35", "40 🎯", "45", "50"],
        correctIndex: 1,
        explanation: "8 x 5 = 40 rất chuẩn xác!"
      }
    ]
  },
  {
    id: 'tpl_english',
    badge: '🇬🇧 Song ngữ dễ nhớ',
    title: 'Tiếng Anh Nhí Thông Thái',
    category: 'Từ vựng Tiếng Anh',
    description: 'Rèn luyện từ vựng tiếng Anh màu sắc, động vật và giao tiếp cơ bản',
    icon: '🌟',
    questions: [
      {
        id: 301,
        question: "Màu 'Vàng' trong tiếng Anh là từ nào?",
        options: ["Red", "Blue", "Yellow 💛", "Green"],
        correctIndex: 2,
        explanation: "Yellow chính là màu vàng rực rỡ như ánh mặt trời!"
      },
      {
        id: 302,
        question: "'Con Chó' trong tiếng Anh là gì?",
        options: ["Cat", "Dog 🐕", "Bird", "Duck"],
        correctIndex: 1,
        explanation: "Dog là chú cún trung thành đáng yêu!"
      },
      {
        id: 303,
        question: "Số 'Mười' trong tiếng Anh viết là gì?",
        options: ["Eight", "Nine", "Ten 🔟", "Seven"],
        correctIndex: 2,
        explanation: "Ten là số 10 tròn trĩnh!"
      },
      {
        id: 304,
        question: "Khi gặp nhau buổi sáng, bạn nói gì?",
        options: ["Good morning! ☀️", "Good night!", "Goodbye!", "Good afternoon!"],
        correctIndex: 0,
        explanation: "Good morning dùng để chào hỏi vui vẻ vào buổi sáng!"
      },
      {
        id: 305,
        question: "Từ nào chỉ quả 'Táo' trong tiếng Anh?",
        options: ["Banana", "Orange", "Apple 🍎", "Mango"],
        correctIndex: 2,
        explanation: "Apple là quả táo ngọt giòn thơm ngon!"
      }
    ]
  },
  {
    id: 'tpl_riddle',
    badge: '🧠 Đố mẹo thông minh',
    title: 'Câu Đố Mẹo Nhanh Trí',
    category: 'Rèn luyện tư duy',
    description: 'Những câu đố vui nhộn giúp kích thích tư duy sắc bén',
    icon: '💡',
    questions: [
      {
        id: 401,
        question: "Cái gì có cổ nhưng không có miệng?",
        options: ["Cái áo 👕", "Cái chai", "Cái bình", "Cây bút"],
        correctIndex: 0,
        explanation: "Chiếc áo có cổ áo nhưng không có miệng ăn cơm!"
      },
      {
        id: 402,
        question: "Con gì đập thì sống, không đập thì chết?",
        options: ["Con tim ❤️", "Con muỗi", "Con cá", "Con ruồi"],
        correctIndex: 0,
        explanation: "Trái tim luôn đập để nuôi dưỡng cơ thể sống khỏe mạnh!"
      },
      {
        id: 403,
        question: "Tháng nào trong một năm có 28 ngày?",
        options: ["Chỉ tháng 2", "Tháng 1", "Tất cả các tháng 📅", "Không tháng nào"],
        correctIndex: 2,
        explanation: "Tất cả 12 tháng trong năm đều có ít nhất 28 ngày!"
      },
      {
        id: 404,
        question: "Càng cất đi thì lại càng thấy to ra là cái gì?",
        options: ["Cái hố 🕳️", "Cái bánh", "Căn nhà", "Cái hộp"],
        correctIndex: 0,
        explanation: "Càng đào cất đất đi thì cái hố càng to ra!"
      },
      {
        id: 405,
        question: "Quả gì năm múi bốn khe, chia ra cánh sao vàng rực?",
        options: ["Quả khế ⭐", "Quả chanh", "Quả ớt", "Quả xoài"],
        correctIndex: 0,
        explanation: "Quả khế khi cắt ngang có hình ngôi sao năm cánh tuyệt đẹp!"
      }
    ]
  },
  {
    id: 'tpl_vietnam',
    badge: '🇻🇳 Quê hương mến yêu',
    title: 'Khám Phá Non Sông Việt Nam',
    category: 'Lịch sử & Địa lý',
    description: 'Tìm hiểu danh lam thắng cảnh và văn hóa ngàn năm dân tộc',
    icon: '🏛️',
    questions: [
      {
        id: 501,
        question: "Thủ đô nghìn năm văn hiến của Việt Nam là gì?",
        options: ["Hà Nội 🏛️", "Huế", "TP. Hồ Chí Minh", "Đà Nẵng"],
        correctIndex: 0,
        explanation: "Hà Nội là thủ đô trái tim thân yêu của Tổ quốc Việt Nam!"
      },
      {
        id: 502,
        question: "Đỉnh núi cao nhất Việt Nam được mệnh danh là 'Nóc nhà Đông Dương'?",
        options: ["Fansipan 🏔️", "Bạch Mộc", "Langbiang", "Bà Nà"],
        correctIndex: 0,
        explanation: "Đỉnh Fansipan ở Sa Pa cao 3.143m là đỉnh núi cao nhất!"
      },
      {
        id: 503,
        question: "Kỳ quan thiên nhiên vịnh biển nổi tiếng thế giới ở Quảng Ninh là gì?",
        options: ["Vịnh Hạ Long ⛵", "Vịnh Nha Trang", "Vịnh Cam Ranh", "Vịnh Lăng Cô"],
        correctIndex: 0,
        explanation: "Vịnh Hạ Long là di sản thiên nhiên thế giới tráng lệ!"
      },
      {
        id: 504,
        question: "Món ăn truyền thống làm từ bánh phở và nước hầm xương thơm ngọt là?",
        options: ["Phở Việt Nam 🍜", "Bún chả", "Bánh xèo", "Cơm tấm"],
        correctIndex: 0,
        explanation: "Phở là món ăn quốc hồn quốc túy lừng danh khắp năm châu!"
      },
      {
        id: 505,
        question: "Dòng sông chín rồng màu mỡ ở miền Nam nước ta là gì?",
        options: ["Sông Cửu Long 🌊", "Sông Hồng", "Sông Hương", "Sông Đồng Nai"],
        correctIndex: 0,
        explanation: "Sông Mê Kông đổ ra biển qua chín cửa sông Cửu Long phù sa màu mỡ!"
      }
    ]
  },
  {
    id: 'tpl_science',
    badge: '🔬 Khoa học quanh em',
    title: 'Khoa Học & Tự Nhiên Diệu Kỳ',
    category: 'Khoa học Thường thức',
    description: 'Khám phá những hiện tượng khoa học thú vị xung quanh cuộc sống',
    icon: '🌈',
    questions: [
      {
        id: 601,
        question: "Nước sôi ở nhiệt độ bao nhiêu độ C ở áp suất thường?",
        options: ["80°C", "90°C", "100°C 🌡️", "120°C"],
        correctIndex: 2,
        explanation: "Nước tinh khiết sôi và bốc hơi ở 100 độ C!"
      },
      {
        id: 602,
        question: "Cây xanh quang hợp nhả ra khí gì cần thiết cho con người thở?",
        options: ["Khí Oxy (O₂) 🍃", "Khí CO₂", "Khí Nitơ", "Khí Metan"],
        correctIndex: 0,
        explanation: "Cây xanh quang hợp tạo ra khí Oxy nuôi dưỡng sự sống trên Trái Đất!"
      },
      {
        id: 603,
        question: "Hành tinh nào gần Mặt Trời nhất trong Hệ Mặt Trời?",
        options: ["Sao Thủy ☀️", "Sao Kim", "Trái Đất", "Sao Hỏa"],
        correctIndex: 0,
        explanation: "Sao Thủy (Mercury) là hành tinh nằm gần Mặt Trời nhất!"
      },
      {
        id: 604,
        question: "Cầu vồng 7 sắc lung linh thường xuất hiện khi nào?",
        options: ["Sau cơn mưa có nắng 🌈", "Ban đêm đầy sao", "Sương mù dày đặc", "Trời rét đậm"],
        correctIndex: 0,
        explanation: "Ánh sáng mặt trời khúc xạ qua những giọt nước mưa tạo nên dải cầu vồng!"
      },
      {
        id: 605,
        question: "Cơ thể con người chiếm khoảng bao nhiêu phần trăm là nước?",
        options: ["Khoảng 70% 💧", "Khoảng 30%", "Khoảng 50%", "Khoảng 90%"],
        correctIndex: 0,
        explanation: "Khoảng 70% trọng lượng cơ thể người là nước, hãy uống đủ nước mỗi ngày!"
      }
    ]
  }
];

// Ultra-fast instant client-side parser (0ms latency, zero API roundtrip)
export function parseQuizTextInstantly(text: string, optionsCount: number = 4) {
  if (!text || !text.trim()) return null;
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Split into question blocks
  const rawBlocks = normalized.split(/\n(?=(?:Câu\s*\d+|Bài\s*\d+|Question\s*\d+|Q\d+|\d+[\.\/\)])\s*[:\.\-]?\s*)/i);
  const parsedQuestions: Question[] = [];

  for (let i = 0; i < rawBlocks.length; i++) {
    const block = rawBlocks[i].trim();
    if (!block) continue;

    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    let questionText = '';
    const options: string[] = [];
    let correctIndex = 0;
    let explanation = '';

    const ansMatch = block.match(/(?:Đáp\s*án|ĐA|Đ\/A|Key|Answer|Lời\s*giải)\s*[:=\-]\s*([A-Da-d1-4])/i);
    if (ansMatch) {
      const char = ansMatch[1].toUpperCase();
      if (char === 'A' || char === '1') correctIndex = 0;
      else if (char === 'B' || char === '2') correctIndex = 1;
      else if (char === 'C' || char === '3') correctIndex = 2;
      else if (char === 'D' || char === '4') correctIndex = 3;
    }

    const expMatch = block.match(/(?:Giải\s*thích|Lời\s*giải|Ghi\s*chú)\s*[:=\-]\s*([^\n]+)/i);
    if (expMatch) {
      explanation = expMatch[1].trim();
    }

    let inQuestion = true;
    for (const line of lines) {
      const optMatch = line.match(/^(\*|\#)?\s*([A-Da-d])[\.\)\/\:\-]\s*(.*)$/);
      if (optMatch) {
        inQuestion = false;
        const isMarked = Boolean(optMatch[1]);
        const letter = optMatch[2].toUpperCase();
        const optContent = optMatch[3].replace(/(?:Đáp\s*án|ĐA|Key|Answer).*$/i, '').trim();

        options.push(optContent || `Lựa chọn ${letter}`);
        if (isMarked) {
          const lIdx = ['A', 'B', 'C', 'D'].indexOf(letter);
          if (lIdx !== -1) correctIndex = lIdx;
        }
      } else if (line.match(/^(?:Đáp\s*án|ĐA|Đ\/A|Key|Answer|Giải\s*thích)/i)) {
        inQuestion = false;
      } else if (inQuestion) {
        const cleaned = line.replace(/^(?:Câu\s*\d+|Bài\s*\d+|Question\s*\d+|Q\d+|\d+[\.\/\)])\s*[:\.\-]?\s*/i, '');
        questionText = questionText ? `${questionText} ${cleaned}` : cleaned;
      }
    }

    if (questionText && options.length >= 2) {
      const finalOpts = [...options];
      while (finalOpts.length < optionsCount) {
        finalOpts.push(`Lựa chọn ${['A', 'B', 'C', 'D'][finalOpts.length]}`);
      }
      const trimmedOpts = finalOpts.slice(0, optionsCount);
      const safeCorrect = Math.min(Math.max(correctIndex, 0), optionsCount - 1);

      parsedQuestions.push({
        id: Date.now() + i,
        question: questionText.trim(),
        options: trimmedOpts,
        correctIndex: safeCorrect,
        explanation: explanation || `Đáp án đúng là ${['A', 'B', 'C', 'D'][safeCorrect]}`
      });
    }
  }

  if (parsedQuestions.length === 0) return null;

  return {
    title: `Đề trích xuất siêu tốc (${parsedQuestions.length} câu)`,
    description: `Trích xuất ngay lập tức từ văn bản (0 giây)`,
    questions: parsedQuestions
  };
}

// Web Audio API Synthesizers for 100% reliable sound effects even without external network
const playHappyChime = (volume: number = 80) => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      const vol = (volume / 100) * 0.25;
      gain.gain.setValueAtTime(vol, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.35);
    });
  } catch (e) {
    console.warn("Audio synthesis error:", e);
  }
};

const playSadChime = (volume: number = 80) => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const notes = [440.00, 392.00, 349.23, 293.66]; // A4, G4, F4, D4
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      const vol = (volume / 100) * 0.22;
      gain.gain.setValueAtTime(vol, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.4);
    });
  } catch (e) {
    console.warn("Audio synthesis error:", e);
  }
};

// Grand multi-burst firework show when answering correctly!
const triggerFireworksShow = () => {
  const duration = 2.4 * 1000;
  const animationEnd = Date.now() + duration;
  const colors = ['#FF69B4', '#FFB7CE', '#FFD700', '#74C0FC', '#63E6BE', '#FFA94D', '#DA77F2', '#FF4D6D'];

  // 1. Initial burst from center
  confetti({
    particleCount: 80,
    spread: 90,
    origin: { x: 0.5, y: 0.55 },
    colors,
    startVelocity: 35
  });

  // 2. Continuous fireworks shooting from left and right corners
  const interval: ReturnType<typeof setInterval> = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      return clearInterval(interval);
    }
    const particleRatio = timeLeft / duration;
    
    // Left side rocket burst
    confetti({
      particleCount: Math.floor(35 * particleRatio) + 15,
      angle: 60,
      spread: 60,
      origin: { x: 0.05, y: 0.75 },
      colors,
      startVelocity: 42
    });

    // Right side rocket burst
    confetti({
      particleCount: Math.floor(35 * particleRatio) + 15,
      angle: 120,
      spread: 60,
      origin: { x: 0.95, y: 0.75 },
      colors,
      startVelocity: 42
    });
  }, 240);
};

// Web Audio synthesizer for crisp countdown ticks
const playTickSound = (volume: number = 80, isUrgent: boolean = false) => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isUrgent ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isUrgent ? 880 : 587.33, ctx.currentTime);
    const vol = (volume / 100) * (isUrgent ? 0.35 : 0.18);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    console.warn("Tick sound error:", e);
  }
};

// Grand triumphant fanfare for Gold Medal winners!
const playVictoryFanfare = (volume: number = 80) => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.15 },  // C5
      { freq: 523.25, time: 0.16, dur: 0.15 }, // C5
      { freq: 523.25, time: 0.32, dur: 0.15 }, // C5
      { freq: 659.25, time: 0.48, dur: 0.32 }, // E5
      { freq: 783.99, time: 0.82, dur: 0.25 }, // G5
      { freq: 1046.50, time: 1.08, dur: 0.85 } // C6 (grand finish!)
    ];
    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
      const vol = (volume / 100) * 0.32;
      gain.gain.setValueAtTime(vol, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + dur);
    });
  } catch (e) {
    console.warn("Victory fanfare error:", e);
  }
};

// Grand Golden Firework & Sparkle Storm for earning the Gold Medal!
const triggerGoldMedalCelebration = () => {
  triggerFireworksShow();
  setTimeout(() => {
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.4 },
      colors: ['#FFD700', '#FFA500', '#FFE600', '#FFFFFF', '#FF8C00']
    });
  }, 400);
  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 120,
      origin: { y: 0.5 },
      colors: ['#FFD700', '#FF69B4', '#FFFFFF']
    });
  }, 1000);
};

const FloatingElements = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: Math.random() * 100 + "%", 
            y: "110%", 
            rotate: 0,
            opacity: 0.2
          }}
          animate={{ 
            y: "-10%", 
            rotate: 360,
            x: (Math.random() * 100 - 10) + "%"
          }}
          transition={{ 
            duration: 15 + Math.random() * 10, 
            repeat: Infinity, 
            ease: "linear",
            delay: Math.random() * 8
          }}
          className="absolute text-soft-pink"
        >
          {i % 2 === 0 ? <Heart size={24 + Math.random() * 24} fill="currentColor" /> : <Star size={20 + Math.random() * 20} fill="currentColor" />}
        </motion.div>
      ))}
    </div>
  );
};

// Finger labels and icons for 4 options
const FINGER_ICONS = ['☝️', '✌️', '🤟', '🖖'];
const FINGER_LABELS = ['1 ngón (A)', '2 ngón (B)', '3 ngón (C)', '4 ngón (D)'];
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);

  // Question sets & Active state
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>(() => {
    const saved = localStorage.getItem('ms_meo_sets_v2');
    return saved ? JSON.parse(saved) : [INITIAL_SET];
  });
  const [activeSetId, setActiveSetId] = useState<string>('default');
  const [gameState, setGameState] = useState<GameState>('START');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(0);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ question: string; selected: string; correct: string; isCorrect: boolean }[]>([]);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingFile, setProcessingFile] = useState(false);
  const [editingSet, setEditingSet] = useState<QuestionSet | null>(null);

  // Audio & Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('ms_meo_app_settings');
    if (saved) {
      try { return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }; } catch (e) { /* ignore */ }
    }
    return DEFAULT_SETTINGS;
  });
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFingerGuideModal, setShowFingerGuideModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'camera' | 'audio' | 'visual' | 'timed'>('camera');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  
  // AI Question Generation Modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiInputMode, setAiInputMode] = useState<'templates' | 'topic' | 'paste'>('templates');
  const [aiTopic, setAiTopic] = useState('');
  const [aiPastedText, setAiPastedText] = useState('');
  const [aiOptionsCount, setAiOptionsCount] = useState<number>(4);
  const [aiCount, setAiCount] = useState<number>(3); // 3 questions by default for ultra-fast generation
  const [aiGrade, setAiGrade] = useState('Tiểu học (Lớp 1-5)');
  const [aiDifficulty, setAiDifficulty] = useState('Vừa phải');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGenSeconds, setAiGenSeconds] = useState(0);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiGeneratedSet, setAiGeneratedSet] = useState<QuestionSet | null>(null);
  const [editingPreviewQIdx, setEditingPreviewQIdx] = useState<number | null>(null);

  // Live timer for tracking speed of AI question generation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (aiGenerating) {
      setAiGenSeconds(0);
      const startTime = Date.now();
      interval = setInterval(() => {
        setAiGenSeconds(Number(((Date.now() - startTime) / 1000).toFixed(1)));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [aiGenerating]);

  // Practice Mode states
  const [practiceViewMode, setPracticeViewMode] = useState<'card' | 'list'>('card');
  const [practiceAlwaysShowAnswer, setPracticeAlwaysShowAnswer] = useState<boolean>(true);
  const [practiceSelectedOption, setPracticeSelectedOption] = useState<number | null>(null);

  // Gesture live detection & dwell-to-confirm
  const [detectedGesture, setDetectedGesture] = useState<{
    fingerCount: number;
    optionIdx: number;
    letter: string;
  } | null>(null);
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const holdStartRef = useRef<{ option: number; time: number } | null>(null);
  const lastGestureTime = useRef(0);
  const COOLDOWN = 600;

  // Timed Mode (Thử thách thời gian & Huy chương vàng)
  const [isTimedMode, setIsTimedMode] = useState<boolean>(false);
  const [totalTimeLimit, setTotalTimeLimit] = useState<number>(60);
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [timedOut, setTimedOut] = useState<boolean>(false);
  const [earnedGoldMedal, setEarnedGoldMedal] = useState<boolean>(false);
  const [goldMedalStats, setGoldMedalStats] = useState<{
    timeUsed: number;
    totalTime: number;
    remaining: number;
    date: string;
  } | null>(null);
  const [goldMedalsCount, setGoldMedalsCount] = useState<number>(() => {
    const saved = localStorage.getItem('ms_meo_gold_medals_count');
    return saved ? parseInt(saved, 10) || 0 : 0;
  });
  const [showTimedConfigModal, setShowTimedConfigModal] = useState<boolean>(false);
  const [showMedalsCabinetModal, setShowMedalsCabinetModal] = useState<boolean>(false);
  const [timedModePace, setTimedModePace] = useState<number>(() => settings.timePerQuestion || 15);

  const questions = questionSets.find(s => s.id === activeSetId)?.questions || DEFAULT_QUESTIONS;
  const currentQuestion = questions[currentQuestionIdx] || questions[0];

  // Save gold medals count
  useEffect(() => {
    localStorage.setItem('ms_meo_gold_medals_count', goldMedalsCount.toString());
  }, [goldMedalsCount]);

  // Save question sets
  useEffect(() => {
    localStorage.setItem('ms_meo_sets_v2', JSON.stringify(questionSets));
  }, [questionSets]);

  // Save settings
  useEffect(() => {
    localStorage.setItem('ms_meo_app_settings', JSON.stringify(settings));
    if (audioRef.current) {
      audioRef.current.volume = settings.musicVolume / 100;
      if (!settings.musicEnabled && isMusicPlaying) {
        audioRef.current.pause();
        setIsMusicPlaying(false);
      }
    }
  }, [settings, isMusicPlaying]);

  // Countdown Timer Effect for Timed Mode
  useEffect(() => {
    if (gameState !== 'PLAYING' || !isTimedMode || timedOut) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimedOut(true);
          setGameState('FINISHED');
          playSadChime(settings.sfxVolume);
          return 0;
        }

        // Warning tick sound when remaining time is low (<= 5s)
        if (prev <= 6 && settings.sfxEnabled) {
          playTickSound(settings.sfxVolume, prev <= 3);
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, isTimedMode, timedOut, settings.sfxEnabled, settings.sfxVolume]);

  // Load available camera devices
  const refreshCameras = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setAvailableCameras(videoInputs);
        if (!settings.cameraDeviceId && videoInputs.length > 0) {
          setSettings(prev => ({ ...prev, cameraDeviceId: videoInputs[0].deviceId }));
        }
      }
    } catch (err) {
      console.warn("Could not list video devices:", err);
    }
  }, [settings.cameraDeviceId]);

  useEffect(() => {
    refreshCameras();
  }, [refreshCameras]);

  // Initialize MediaPipe vision models
  useEffect(() => {
    async function initAI() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        setLoading(false);
      } catch (error) {
        console.error("Failed to initialize AI models:", error);
        setLoading(false);
      }
    }
    initAI();
  }, []);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
    setDetectedGesture(null);
    setHoldProgress(0);
    holdStartRef.current = null;
  };

  const startCamera = async (deviceId?: string) => {
    stopCamera();
    if (videoRef.current) {
      try {
        const targetDeviceId = deviceId || settings.cameraDeviceId;
        const constraints: MediaStreamConstraints = {
          video: targetDeviceId 
            ? { deviceId: { exact: targetDeviceId }, width: 640, height: 480 }
            : { width: 640, height: 480 }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraReady(true);
          setGameState('PLAYING');
        };
      } catch (err) {
        console.error("Camera access failed:", err);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              setIsCameraReady(true);
              setGameState('PLAYING');
            };
          }
        } catch (fallbackErr) {
          console.error("Fallback camera also failed:", fallbackErr);
        }
      }
    }
  };

  const startPractice = (setId?: string) => {
    stopCamera();
    if (setId) {
      setActiveSetId(setId);
    }
    setCurrentQuestionIdx(0);
    setPracticeSelectedOption(null);
    setGameState('PRACTICE');
  };

  const startStandardGame = (setId?: string) => {
    if (setId) {
      setActiveSetId(setId);
    }
    setIsTimedMode(false);
    setTimedOut(false);
    setEarnedGoldMedal(false);
    setGoldMedalStats(null);
    setCurrentQuestionIdx(0);
    setSelectedOption(0);
    setScore(0);
    setUserAnswers([]);
    setHoldProgress(0);
    holdStartRef.current = null;
    startCamera();
  };

  const startTimedChallenge = (setId?: string, customSecPerQ?: number) => {
    const targetSetId = setId || activeSetId;
    if (setId) {
      setActiveSetId(targetSetId);
    }
    const targetSet = questionSets.find(s => s.id === targetSetId);
    const qCount = targetSet?.questions.length || questions.length || 4;
    const pace = customSecPerQ || timedModePace || settings.timePerQuestion || 15;
    const totalSec = qCount * pace;

    setIsTimedMode(true);
    setTotalTimeLimit(totalSec);
    setTimeRemaining(totalSec);
    setTimedOut(false);
    setEarnedGoldMedal(false);
    setGoldMedalStats(null);
    setCurrentQuestionIdx(0);
    setSelectedOption(0);
    setScore(0);
    setUserAnswers([]);
    setHoldProgress(0);
    holdStartRef.current = null;
    setShowTimedConfigModal(false);
    startCamera();
  };

  // Keyboard navigation for Practice Mode & Playing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'PRACTICE') {
        if (e.key === 'ArrowLeft') {
          setCurrentQuestionIdx(prev => Math.max(0, prev - 1));
          setPracticeSelectedOption(null);
        } else if (e.key === 'ArrowRight') {
          setCurrentQuestionIdx(prev => Math.min(questions.length - 1, prev + 1));
          setPracticeSelectedOption(null);
        } else if (e.key === '1' || e.key === 'a' || e.key === 'A') {
          setPracticeSelectedOption(0);
        } else if (e.key === '2' || e.key === 'b' || e.key === 'B') {
          setPracticeSelectedOption(1);
        } else if (e.key === '3' || e.key === 'c' || e.key === 'C') {
          if (currentQuestion.options.length >= 3) setPracticeSelectedOption(2);
        } else if (e.key === '4' || e.key === 'd' || e.key === 'D') {
          if (currentQuestion.options.length >= 4) setPracticeSelectedOption(3);
        }
      } else if (gameState === 'PLAYING') {
        if (e.key === '1' || e.key === 'a' || e.key === 'A') {
          setSelectedOption(0);
        } else if (e.key === '2' || e.key === 'b' || e.key === 'B') {
          if (currentQuestion.options.length >= 2) setSelectedOption(1);
        } else if (e.key === '3' || e.key === 'c' || e.key === 'C') {
          if (currentQuestion.options.length >= 3) setSelectedOption(2);
        } else if (e.key === '4' || e.key === 'd' || e.key === 'D') {
          if (currentQuestion.options.length >= 4) setSelectedOption(3);
        } else if (e.key === 'Enter' || e.key === ' ') {
          handleConfirm();
        }
      } else if (gameState === 'RESULT') {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, questions.length, currentQuestion.options.length]);

  // Sensitivity thresholds
  const getSensitivityThresholds = () => {
    switch (settings.sensitivity) {
      case 'high':
        return { right: 0.45, left: 0.55 };
      case 'low':
        return { right: 0.38, left: 0.62 };
      case 'medium':
      default:
        return { right: 0.42, left: 0.58 };
    }
  };

  // Vision detection loop
  const detect = useCallback(() => {
    if (!videoRef.current || !faceLandmarkerRef.current || !handLandmarkerRef.current || 
        gameState === 'FINISHED' || gameState === 'EDITING' || gameState === 'PRACTICE' || 
        gameState === 'CERTIFICATE' || gameState === 'DETAILS') return;
    
    const startTimeMs = performance.now();
    if (videoRef.current.readyState >= 2) {
      const faceResult = faceLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
      const handResult = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
      processGestures(faceResult, handResult);
    }
    requestRef.current = requestAnimationFrame(detect);
  }, [gameState, selectedOption, currentQuestion.options.length]);

  useEffect(() => {
    if (isCameraReady && gameState !== 'EDITING' && gameState !== 'PRACTICE') {
      requestRef.current = requestAnimationFrame(detect);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isCameraReady, detect, gameState]);

  // Gesture Processing: Head turning & Finger Counting for 4 options
  const processGestures = (faceResult: FaceLandmarkerResult, handResult: HandLandmarkerResult) => {
    const now = Date.now();
    const totalOptions = currentQuestion.options.length;

    // 1. Hand gesture recognition by finger count (☝️ 1: A, ✌️ 2: B, 🤟 3: C, 🖖 4: D)
    let fingerDetected = false;

    if (handResult.landmarks && handResult.landmarks.length > 0) {
      const landmarks = handResult.landmarks[0];
      
      // Determine extended fingers (landmarks[tip].y < landmarks[pip].y in standard camera view)
      const isIndexExtended = landmarks[8].y < landmarks[6].y;
      const isMiddleExtended = landmarks[12].y < landmarks[10].y;
      const isRingExtended = landmarks[16].y < landmarks[14].y;
      const isPinkyExtended = landmarks[20].y < landmarks[18].y;

      let count = 0;
      if (isIndexExtended) count++;
      if (isMiddleExtended) count++;
      if (isRingExtended) count++;
      if (isPinkyExtended) count++;

      if (gameState === 'PLAYING') {
        if (count >= 1 && count <= totalOptions) {
          fingerDetected = true;
          const targetOpt = count - 1;
          
          if (selectedOption !== targetOpt) {
            setSelectedOption(targetOpt);
            holdStartRef.current = { option: targetOpt, time: now };
            setHoldProgress(0);
          } else {
            // Finger held on current option -> calculate hold progress (1.3s to confirm)
            if (!holdStartRef.current || holdStartRef.current.option !== targetOpt) {
              holdStartRef.current = { option: targetOpt, time: now };
            }
            const elapsed = now - holdStartRef.current.time;
            const progress = Math.min(100, Math.round((elapsed / 1300) * 100));
            setHoldProgress(progress);

            if (progress >= 100) {
              handleConfirm();
              holdStartRef.current = null;
              setHoldProgress(0);
              lastGestureTime.current = now;
              return;
            }
          }

          setDetectedGesture({
            fingerCount: count,
            optionIdx: targetOpt,
            letter: OPTION_LETTERS[targetOpt]
          });
        }
      }

      // Next question via hand gesture in RESULT screen
      if (gameState === 'RESULT') {
        if (count >= 1 && now - lastGestureTime.current > COOLDOWN) {
          handleNext();
          lastGestureTime.current = now;
          return;
        }
      }
    }

    if (!fingerDetected) {
      if (holdStartRef.current) {
        holdStartRef.current = null;
        setHoldProgress(0);
      }
      setDetectedGesture(null);

      // 2. Head turning fallback for 2-option sets or quick left/right selection
      if (faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0 && gameState === 'PLAYING' && totalOptions === 2) {
        const nose = faceResult.faceLandmarks[0][1];
        const { right: rightThresh, left: leftThresh } = getSensitivityThresholds();

        if (nose.x < rightThresh) { // Turned Right -> Option A
          setSelectedOption(0);
        } else if (nose.x > leftThresh) { // Turned Left -> Option B
          setSelectedOption(1);
        }
      }
    }
  };

  const playSfx = (type: 'correct' | 'incorrect') => {
    if (!settings.sfxEnabled) return;

    if (type === 'correct') {
      const audio = new Audio('https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3');
      audio.volume = settings.sfxVolume / 100;
      audio.play().catch(() => {
        playHappyChime(settings.sfxVolume);
      });
    } else {
      const audio = new Audio('https://cdn.pixabay.com/audio/2021/08/04/audio_bbdec39215.mp3');
      audio.volume = settings.sfxVolume / 100;
      audio.play().catch(() => {
        playSadChime(settings.sfxVolume);
      });
    }
  };

  const handleConfirm = () => {
    const isCorrect = selectedOption === currentQuestion.correctIndex;
    
    // Record answer
    setUserAnswers(prev => [...prev, {
      question: currentQuestion.question,
      selected: currentQuestion.options[selectedOption],
      correct: currentQuestion.options[currentQuestion.correctIndex],
      isCorrect
    }]);

    if (isCorrect) {
      setScore(prev => prev + 1);
      
      // Fireworks show on correct answer!
      if (settings.enableFireworks) {
        triggerFireworksShow();
      } else {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D8B4FE', '#B2F2BB', '#FFF3BF']
        });
      }

      playSfx('correct');
    } else {
      playSfx('incorrect');
    }

    setHoldProgress(0);
    holdStartRef.current = null;
    setGameState('RESULT');
  };

  const handleNext = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOption(0);
      setHoldProgress(0);
      holdStartRef.current = null;
      setGameState('PLAYING');
    } else {
      // Completed all questions in the set!
      if (isTimedMode && !timedOut && timeRemaining > 0) {
        // Evaluate if user got 100% of questions correct
        const totalCorrect = userAnswers.filter(a => a.isCorrect).length;
        if (totalCorrect === questions.length) {
          const usedSec = Math.max(1, totalTimeLimit - timeRemaining);
          setEarnedGoldMedal(true);
          setGoldMedalStats({
            timeUsed: usedSec,
            totalTime: totalTimeLimit,
            remaining: timeRemaining,
            date: new Date().toLocaleDateString('vi-VN')
          });
          setGoldMedalsCount(prev => prev + 1);
          triggerGoldMedalCelebration();
          playVictoryFanfare(settings.sfxVolume);
        }
      }
      setGameState('FINISHED');
    }
  };

  const resetGame = () => {
    setCurrentQuestionIdx(0);
    setSelectedOption(0);
    setScore(0);
    setUserAnswers([]);
    setHoldProgress(0);
    holdStartRef.current = null;
    if (isTimedMode) {
      setTimeRemaining(totalTimeLimit);
      setTimedOut(false);
      setEarnedGoldMedal(false);
      setGoldMedalStats(null);
    }
    setGameState('PLAYING');
  };

  const handleQuestionImageUpload = (qId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingSet) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setEditingSet({
        ...editingSet,
        questions: editingSet.questions.map(q => q.id === qId ? { ...q, image: base64 } : q)
      });
    };
    reader.readAsDataURL(file);
  };

  const removeQuestionImage = (qId: number) => {
    if (!editingSet) return;
    setEditingSet({
      ...editingSet,
      questions: editingSet.questions.map(q => q.id === qId ? { ...q, image: undefined } : q)
    });
  };

  const handleShare = async () => {
    let text = `Tôi vừa hoàn thành bài trắc nghiệm trên Ms Mèo và đạt được ${score}/${questions.length} điểm! 🎉✨ Hãy cùng tham gia thử thách cử chỉ với Ms Mèo nhé!`;
    if (earnedGoldMedal) {
      text = `🏆 Tôi vừa xuất sắc giành được HUY CHƯƠNG VÀNG 🥇 trong Thử Thách Thời Gian của Ms Mèo! Hoàn thành 100% trong ${goldMedalStats?.timeUsed || (totalTimeLimit - timeRemaining)} giây! 🎉✨ Hãy cùng vào thử sức phản xạ cử chỉ với Ms Mèo nhé!`;
    }
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: earnedGoldMedal ? 'Huy chương Vàng Ms Mèo 🥇' : 'Kết quả thử thách Ms Mèo',
          text: text,
          url: url,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        alert('Đã sao chép kết quả vào bộ nhớ tạm! Bạn có thể dán để chia sẻ.');
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
    }
  };

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause();
        setIsMusicPlaying(false);
      } else {
        audioRef.current.volume = settings.musicVolume / 100;
        audioRef.current.play().then(() => {
          setIsMusicPlaying(true);
        }).catch(e => {
          console.warn("Music play blocked or failed:", e);
          setIsMusicPlaying(false);
        });
      }
    }
  };

  const handleSaveQuestions = () => {
    if (!editingSet) return;
    setQuestionSets(prev => prev.map(s => s.id === editingSet.id ? editingSet : s));
    setGameState('LIBRARY');
  };

  const createNewSet = () => {
    const newSet: QuestionSet = {
      id: Date.now().toString(),
      title: `Bộ câu hỏi mới ${questionSets.length + 1}`,
      questions: [...DEFAULT_QUESTIONS],
      createdAt: Date.now()
    };
    setQuestionSets(prev => [...prev, newSet]);
    setEditingSet(newSet);
    setGameState('EDITING');
  };

  const deleteSet = (id: string) => {
    if (id === 'default') return;
    setQuestionSets(prev => prev.filter(s => s.id !== id));
  };

  const updateQuestion = (id: number, field: keyof Question, value: unknown) => {
    if (!editingSet) return;
    setEditingSet({
      ...editingSet,
      questions: editingSet.questions.map(q => q.id === id ? { ...q, [field]: value } : q)
    });
  };

  const updateOption = (qId: number, optIdx: number, val: string) => {
    if (!editingSet) return;
    setEditingSet({
      ...editingSet,
      questions: editingSet.questions.map(q => {
        if (q.id === qId) {
          const newOpts = [...q.options];
          newOpts[optIdx] = val;
          return { ...q, options: newOpts };
        }
        return q;
      })
    });
  };

  const addOptionToQuestion = (qId: number) => {
    if (!editingSet) return;
    setEditingSet({
      ...editingSet,
      questions: editingSet.questions.map(q => {
        if (q.id === qId && q.options.length < 4) {
          return { ...q, options: [...q.options, `Lựa chọn ${OPTION_LETTERS[q.options.length]}`] };
        }
        return q;
      })
    });
  };

  const removeOptionFromQuestion = (qId: number, optIdx: number) => {
    if (!editingSet) return;
    setEditingSet({
      ...editingSet,
      questions: editingSet.questions.map(q => {
        if (q.id === qId && q.options.length > 2) {
          const newOpts = q.options.filter((_, idx) => idx !== optIdx);
          const newCorrect = q.correctIndex >= newOpts.length ? 0 : q.correctIndex;
          return { ...q, options: newOpts, correctIndex: newCorrect };
        }
        return q;
      })
    });
  };

  // Upload file parsed through Server-side Gemini API
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingFile(true);
    try {
      let bodyPayload: { textContent?: string; base64Data?: string; mimeType?: string; optionsCount?: number } = {
        optionsCount: aiOptionsCount
      };

      if (file.type === 'text/plain') {
        const text = await file.text();
        bodyPayload.textContent = text;
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        bodyPayload.textContent = result.value;
      } else if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        bodyPayload.base64Data = base64;
        bodyPayload.mimeType = file.type;
      } else {
        alert("Định dạng tệp không được hỗ trợ. Vui lòng tải lên .txt, .docx, .pdf hoặc ảnh.");
        setProcessingFile(false);
        return;
      }

      const res = await fetch('/api/ai/parse-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi xử lý tệp');
      }

      const data = await res.json();
      const newQuestions: Question[] = (data.questions || []).map((q: { question: string; options: string[]; correctIndex: number }, index: number) => ({
        id: Date.now() + index,
        question: q.question,
        options: q.options,
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0
      }));

      if (newQuestions.length > 0 && editingSet) {
        setEditingSet({
          ...editingSet,
          questions: newQuestions
        });
      }
    } catch (error: unknown) {
      console.error("Error processing file:", error);
      alert((error as Error).message || "Có lỗi xảy ra khi xử lý tệp. Vui lòng thử lại.");
    } finally {
      setProcessingFile(false);
    }
  };

  // AI Generation from Topic (Supports 1-click quick generation)
  const handleGenerateQuestionsWithAi = async (overrideTopic?: string, overrideCount?: number) => {
    const targetTopic = (overrideTopic || aiTopic).trim();
    const targetCount = overrideCount || aiCount;

    if (!targetTopic) {
      setAiError("Vui lòng nhập chủ đề bạn muốn tạo câu hỏi!");
      return;
    }

    if (overrideTopic) setAiTopic(overrideTopic);
    if (overrideCount) setAiCount(overrideCount);

    setAiGenerating(true);
    setAiError(null);

    try {
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: targetTopic,
          count: targetCount,
          grade: aiGrade,
          difficulty: aiDifficulty,
          optionsCount: aiOptionsCount
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Lỗi máy chủ khi tạo câu hỏi với AI');
      }

      const data = await res.json();
      const generatedSet: QuestionSet = {
        id: 'ai_' + Date.now().toString(),
        title: data.title || `Bộ câu hỏi AI: ${targetTopic}`,
        description: data.description || `Được tạo tự động bởi AI Ms Mèo (${aiOptionsCount} đáp án)`,
        questions: data.questions || [],
        createdAt: Date.now()
      };

      setAiGeneratedSet(generatedSet);
      setEditingPreviewQIdx(null);
    } catch (err: unknown) {
      console.error("AI Generation error:", err);
      setAiError((err as Error).message || "Không thể tạo câu hỏi lúc này. Vui lòng thử lại!");
    } finally {
      setAiGenerating(false);
    }
  };

  // Instant Client-Side Parsing (0 seconds, zero network wait)
  const handleInstantParsePastedText = () => {
    if (!aiPastedText.trim()) {
      setAiError("Vui lòng dán nội dung văn bản hoặc đề thi vào ô trống!");
      return;
    }

    const instantResult = parseQuizTextInstantly(aiPastedText, aiOptionsCount);
    if (!instantResult || instantResult.questions.length === 0) {
      setAiError("Chưa phát hiện rõ cấu trúc trắc nghiệm (A, B, C, D). Bạn có thể bấm 'Phân tích bằng AI nâng cao' để Ms Mèo tự động tách giúp bạn!");
      return;
    }

    const generatedSet: QuestionSet = {
      id: 'instant_' + Date.now().toString(),
      title: instantResult.title,
      description: instantResult.description,
      questions: instantResult.questions,
      createdAt: Date.now()
    };

    setAiGeneratedSet(generatedSet);
    setEditingPreviewQIdx(null);
    setAiError(null);
  };

  // 1-Click Instant Template Selection (0 seconds)
  const handleSelectInstantTemplate = (tpl: InstantTemplate) => {
    const generatedSet: QuestionSet = {
      id: 'tpl_' + Date.now().toString(),
      title: tpl.title,
      description: tpl.description,
      questions: tpl.questions.map((q, idx) => ({
        ...q,
        id: Date.now() + idx
      })),
      createdAt: Date.now()
    };
    setAiGeneratedSet(generatedSet);
    setEditingPreviewQIdx(null);
    setAiError(null);
  };

  // AI Parsing from Pasted Text (Deep analysis via AI Gemini)
  const handleParsePastedTextWithAi = async () => {
    if (!aiPastedText.trim()) {
      setAiError("Vui lòng dán nội dung văn bản hoặc đề thi vào ô trống!");
      return;
    }

    setAiGenerating(true);
    setAiError(null);

    try {
      const res = await fetch('/api/ai/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: aiPastedText,
          optionsCount: aiOptionsCount,
          title: `Đề thi trích xuất ${new Date().toLocaleDateString('vi-VN')}`
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Lỗi khi phân tích văn bản đề thi');
      }

      const data = await res.json();
      const generatedSet: QuestionSet = {
        id: 'ai_' + Date.now().toString(),
        title: data.title || 'Bộ câu hỏi từ văn bản ngoài',
        description: data.description || `Trích xuất tự động (${aiOptionsCount} đáp án)`,
        questions: data.questions || [],
        createdAt: Date.now()
      };

      setAiGeneratedSet(generatedSet);
      setEditingPreviewQIdx(null);
    } catch (err: unknown) {
      console.error("AI Parse Text error:", err);
      setAiError((err as Error).message || "Không thể phân tích đoạn văn bản này. Vui lòng kiểm tra lại nội dung!");
    } finally {
      setAiGenerating(false);
    }
  };

  // --- MANUAL EDITING IN AI PREVIEW LIST ---
  const handleUpdateAiPreviewQuestion = (qIdx: number, field: keyof Question, value: unknown) => {
    if (!aiGeneratedSet) return;
    const updatedQuestions = [...aiGeneratedSet.questions];
    updatedQuestions[qIdx] = {
      ...updatedQuestions[qIdx],
      [field]: value
    };
    setAiGeneratedSet({
      ...aiGeneratedSet,
      questions: updatedQuestions
    });
  };

  const handleUpdateAiPreviewOption = (qIdx: number, optIdx: number, val: string) => {
    if (!aiGeneratedSet) return;
    const updatedQuestions = [...aiGeneratedSet.questions];
    const updatedOptions = [...updatedQuestions[qIdx].options];
    updatedOptions[optIdx] = val;
    updatedQuestions[qIdx] = {
      ...updatedQuestions[qIdx],
      options: updatedOptions
    };
    setAiGeneratedSet({
      ...aiGeneratedSet,
      questions: updatedQuestions
    });
  };

  const handleDeleteAiPreviewQuestion = (qIdx: number) => {
    if (!aiGeneratedSet) return;
    if (aiGeneratedSet.questions.length <= 1) {
      alert("Bộ câu hỏi cần tối thiểu 1 câu hỏi!");
      return;
    }
    const updatedQuestions = aiGeneratedSet.questions.filter((_, idx) => idx !== qIdx);
    setAiGeneratedSet({
      ...aiGeneratedSet,
      questions: updatedQuestions
    });
    if (editingPreviewQIdx === qIdx) {
      setEditingPreviewQIdx(null);
    }
  };

  const handleAddAiPreviewQuestion = () => {
    if (!aiGeneratedSet) return;
    const defaultOpts = aiOptionsCount === 4 
      ? ['Lựa chọn A', 'Lựa chọn B', 'Lựa chọn C', 'Lựa chọn D']
      : ['Đúng', 'Sai'];
    const newQuestion: Question = {
      id: Date.now(),
      question: 'Câu hỏi mới tự tạo...',
      options: defaultOpts,
      correctIndex: 0,
      explanation: 'Giải thích cho câu hỏi...'
    };
    setAiGeneratedSet({
      ...aiGeneratedSet,
      questions: [...aiGeneratedSet.questions, newQuestion]
    });
    setEditingPreviewQIdx(aiGeneratedSet.questions.length);
  };

  // Action after AI generation
  const handleSaveAiSetToLibrary = () => {
    if (!aiGeneratedSet) return;
    setQuestionSets(prev => [aiGeneratedSet, ...prev]);
    setActiveSetId(aiGeneratedSet.id);
    setShowAiModal(false);
    setAiGeneratedSet(null);
    setGameState('LIBRARY');
  };

  const handlePlayAiSetImmediately = () => {
    if (!aiGeneratedSet) return;
    setQuestionSets(prev => [aiGeneratedSet, ...prev]);
    setActiveSetId(aiGeneratedSet.id);
    setShowAiModal(false);
    setAiGeneratedSet(null);
    resetGame();
    startCamera();
  };

  const handlePracticeAiSetImmediately = () => {
    if (!aiGeneratedSet) return;
    setQuestionSets(prev => [aiGeneratedSet, ...prev]);
    setActiveSetId(aiGeneratedSet.id);
    setShowAiModal(false);
    setAiGeneratedSet(null);
    startPractice(aiGeneratedSet.id);
  };

  if (loading) return (
    <div className="min-h-screen bg-warm-bg flex flex-col items-center justify-center">
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }} 
        transition={{ repeat: Infinity, duration: 2 }}
        className="text-soft-pink mb-4"
      >
        <Heart size={64} fill="currentColor" />
      </motion.div>
      <p className="text-xl font-bold text-pink-400 tracking-widest animate-pulse">Đang chuẩn bị phép thuật Ms Mèo... ✨</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-warm-bg text-zinc-700 p-4 md:p-8 overflow-x-hidden relative">
      {settings.floatingElements && <FloatingElements />}
      
      {/* HEADER */}
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-8 relative z-10">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          onClick={() => { stopCamera(); setGameState('START'); }}
          className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity"
          title="Về trang chủ Ms Mèo"
        >
          <div className="bg-soft-pink p-1 rounded-2xl shadow-lg shadow-pink-100 overflow-hidden w-14 h-14 flex items-center justify-center">
            <img 
              src="https://upload.wikimedia.org/wikipedia/en/0/05/Hello_kitty_character_portrait.png" 
              alt="Hello Kitty" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-pink-400 tracking-tight">Ms Mèo</h1>
            <span className="text-[10px] uppercase font-black text-pink-300 tracking-widest block -mt-1">
              Trắc nghiệm cử chỉ 4 ngón tay 🐾
            </span>
          </div>
        </motion.div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Finger gesture guidance button */}
          <button 
            onClick={() => setShowFingerGuideModal(true)}
            className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-3.5 py-2.5 rounded-full font-bold text-xs md:text-sm shadow-xs transition-all flex items-center gap-1.5"
            title="Hướng dẫn chọn đáp án bằng từng ngón tay"
          >
            <Hand size={16} className="text-amber-600" />
            <span className="hidden sm:inline">Cử chỉ ngón tay</span>
            <span className="sm:hidden">Cử chỉ</span>
          </button>

          {/* Fast Question Creation Button in Header */}
          <button 
            onClick={() => {
              setAiError(null);
              setAiGeneratedSet(null);
              setShowAiModal(true);
            }}
            className="bg-gradient-to-r from-pink-400 via-purple-400 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white px-3.5 py-2.5 rounded-full font-bold text-xs md:text-sm shadow-md hover:scale-105 transition-all flex items-center gap-1.5"
            title="Tạo bộ câu hỏi siêu tốc (Kho mẫu 0s, Tạo AI nhanh, Dán văn bản)"
          >
            <Zap size={16} className="text-yellow-200 fill-yellow-200 animate-pulse" />
            <span className="hidden sm:inline">Tạo câu hỏi nhanh</span>
            <span className="sm:hidden">Tạo nhanh</span>
          </button>

          {/* Settings Button */}
          <button 
            onClick={() => {
              refreshCameras();
              setShowSettingsModal(true);
            }}
            className="p-3 rounded-full bg-white text-zinc-600 hover:text-pink-500 hover:bg-pink-50 border border-pink-100 shadow-sm transition-all hover:scale-105"
            title="Cài đặt Camera & Âm thanh"
          >
            <Settings size={20} />
          </button>

          {/* Music Button */}
          <button 
            onClick={toggleMusic}
            className={`p-3 rounded-full shadow-sm transition-all hover:scale-105 ${
              isMusicPlaying ? 'bg-pink-100 text-pink-500' : 'bg-white text-zinc-400'
            }`}
            title={isMusicPlaying ? "Tắt nhạc nền" : "Bật nhạc nền vui nhộn"}
          >
            <Music size={20} className={isMusicPlaying ? "animate-spin" : ""} />
          </button>

          {/* Library Button */}
          <button 
            onClick={() => {
              stopCamera();
              setGameState('LIBRARY');
            }} 
            className="p-3 rounded-full bg-white text-pink-400 shadow-sm hover:bg-pink-50 transition-colors"
            title="Thư viện câu hỏi"
          >
            <BookOpen size={20} />
          </button>

          {/* Timed Challenge Button */}
          <button 
            onClick={() => setShowTimedConfigModal(true)}
            className="bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white px-3.5 py-2.5 rounded-full font-bold text-xs md:text-sm shadow-md hover:scale-105 transition-all flex items-center gap-1.5"
            title="Chế độ Thử thách thời gian - Trả lời đúng tất cả để nhận Huy chương Vàng"
          >
            <Timer size={16} />
            <span className="hidden sm:inline">Thử thách</span>
            <span className="sm:hidden">⏱️</span>
          </button>

          {/* Gold Medals Cabinet Button */}
          {goldMedalsCount > 0 && (
            <button 
              onClick={() => setShowMedalsCabinetModal(true)}
              className="bg-gradient-to-r from-yellow-100 via-amber-100 to-yellow-200 hover:bg-yellow-200 text-amber-900 border-2 border-amber-300 px-3 py-2 rounded-full font-black text-xs shadow-xs hover:scale-105 transition-all flex items-center gap-1"
              title={`Bạn đã đạt được ${goldMedalsCount} Huy chương Vàng! Bấm xem chi tiết`}
            >
              <Award size={15} className="text-amber-600" />
              <span>x{goldMedalsCount}</span>
            </button>
          )}

          {/* Practice Mode Button */}
          <button 
            onClick={() => startPractice()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-full font-bold text-xs md:text-sm shadow-md hover:scale-105 transition-all flex items-center gap-1.5"
            title="Chế độ Luyện tập - Xem câu hỏi & đáp án không tính điểm"
          >
            <GraduationCap size={16} />
            <span className="hidden sm:inline">Luyện tập</span>
          </button>
        </div>

        {/* Background Audio Element */}
        <audio 
          ref={audioRef} 
          src="https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73467.mp3" 
          loop 
          preload="auto"
          onError={() => console.warn("Background music note: failed to stream, continuing without bgm.")}
        />
      </header>

      {/* QUICK GESTURE BANNER (Always visible when in PLAYING state) */}
      {gameState === 'PLAYING' && (
        <div className="max-w-6xl mx-auto mb-4 bg-white/90 backdrop-blur-md border-2 border-pink-100 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="bg-pink-100 text-pink-600 font-black text-xs px-2.5 py-1 rounded-xl flex items-center gap-1">
              <Hand size={14} /> Cử chỉ ngón tay:
            </span>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
              <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg border border-purple-100">☝️ 1: A</span>
              <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg border border-purple-100">✌️ 2: B</span>
              {currentQuestion.options.length >= 3 && (
                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg border border-purple-100">🤟 3: C</span>
              )}
              {currentQuestion.options.length >= 4 && (
                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg border border-purple-100">🖖 4: D</span>
              )}
            </div>
          </div>
          <div className="text-[11px] font-bold text-pink-500 flex items-center gap-1">
            <span>⏱️ Giữ 1.3s để tự động chốt đáp án</span>
            <button 
              onClick={() => setShowFingerGuideModal(true)}
              className="ml-1 underline text-zinc-400 hover:text-pink-600"
            >
              Chi tiết
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-start relative z-10">
        
        {/* LEFT COLUMN: CAMERA OR PRACTICE PANEL */}
        <section className="relative">
          {gameState === 'PRACTICE' ? (
            <motion.div 
              key="practice-dashboard"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-2xl shadow-pink-100 border-4 border-pink-100 relative overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-pink-100">
                <div className="bg-pink-100 p-2 rounded-2xl w-14 h-14 flex items-center justify-center shrink-0 shadow-sm">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/en/0/05/Hello_kitty_character_portrait.png" 
                    alt="Study Kitty" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">Chế độ Ôn tập</span>
                    <span className="text-xs text-zinc-400 font-bold">Không dùng camera</span>
                  </div>
                  <h3 className="text-xl font-black text-pink-500">Góc Học Tập Ms Mèo 🐾</h3>
                </div>
              </div>

              {/* Set selector info */}
              <div className="bg-pink-50/60 rounded-2xl p-4 mb-5 border border-pink-100">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Bộ câu hỏi đang ôn:</div>
                <div className="text-base font-black text-zinc-800 flex items-center justify-between">
                  <span className="truncate pr-2">{questionSets.find(s => s.id === activeSetId)?.title || 'Bộ câu hỏi'}</span>
                  <span className="text-xs bg-white text-pink-500 font-bold px-2.5 py-1 rounded-xl shadow-xs shrink-0 border border-pink-100">
                    {questions.length} câu • {questions[0]?.options.length || 4} đáp án
                  </span>
                </div>
              </div>

              {/* Display & Study Controls */}
              <div className="space-y-3 mb-5">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cách hiển thị đáp án:</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setPracticeAlwaysShowAnswer(true); setPracticeSelectedOption(null); }}
                    className={`p-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      practiceAlwaysShowAnswer 
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' 
                        : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100'
                    }`}
                  >
                    <Eye size={16} /> Hiện đáp án (#)
                  </button>
                  <button
                    onClick={() => { setPracticeAlwaysShowAnswer(false); setPracticeSelectedOption(null); }}
                    className={`p-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      !practiceAlwaysShowAnswer 
                        ? 'bg-pink-400 text-white shadow-md shadow-pink-200' 
                        : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100'
                    }`}
                  >
                    <EyeOff size={16} /> Tự bấm chọn thử
                  </button>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setPracticeViewMode('card')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      practiceViewMode === 'card' 
                        ? 'bg-pink-100 text-pink-600 border border-pink-200 shadow-xs' 
                        : 'bg-zinc-50 text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    Xem thẻ từng câu
                  </button>
                  <button
                    onClick={() => setPracticeViewMode('list')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      practiceViewMode === 'list' 
                        ? 'bg-pink-100 text-pink-600 border border-pink-200 shadow-xs' 
                        : 'bg-zinc-50 text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    <List size={14} className="inline mr-1" /> Toàn bộ đề
                  </button>
                </div>
              </div>

              {/* Quick Jump Grid */}
              <div className="mb-5">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Chuyển nhanh câu hỏi:</div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1 custom-scrollbar">
                  {questions.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentQuestionIdx(idx);
                        setPracticeSelectedOption(null);
                        setPracticeViewMode('card');
                      }}
                      className={`w-8 h-8 rounded-xl font-bold text-xs transition-all ${
                        currentQuestionIdx === idx && practiceViewMode === 'card'
                          ? 'bg-pink-400 text-white shadow-md shadow-pink-200 scale-105'
                          : 'bg-zinc-50 text-zinc-600 hover:bg-pink-50 hover:text-pink-500 border border-zinc-100'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 space-y-2.5">
                <button
                  onClick={() => { resetGame(); startCamera(); }}
                  className="w-full bg-pink-400 hover:bg-pink-500 text-white py-3.5 rounded-2xl font-bold text-base shadow-lg shadow-pink-200 cute-button flex items-center justify-center gap-2"
                >
                  <Gamepad2 size={20} /> Sẵn sàng! Vào chơi bằng Camera 🎮
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGameState('LIBRARY')}
                    className="flex-1 bg-white text-zinc-600 border border-zinc-200 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <BookOpen size={14} /> Đổi bộ câu hỏi
                  </button>
                  <button
                    onClick={() => { stopCamera(); setGameState('START'); }}
                    className="flex-1 bg-white text-zinc-600 border border-zinc-200 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Home size={14} /> Trang chủ
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="aspect-video bg-white border-8 border-white rounded-[2.5rem] shadow-2xl shadow-pink-100 relative overflow-hidden"
            >
              <video 
                ref={videoRef} 
                className={`w-full h-full object-cover ${settings.mirrorCamera ? 'scale-x-[-1]' : ''}`} 
                playsInline 
                muted 
              />
              {!isCameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-pink-50 p-6 text-center">
                  <Camera className="w-12 h-12 text-pink-300 animate-bounce mb-3" />
                  <p className="font-bold text-pink-400 text-sm">Camera sẵn sàng kích hoạt</p>
                  <button
                    onClick={() => startCamera()}
                    className="mt-3 bg-pink-400 hover:bg-pink-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-sm cute-button flex items-center gap-1.5"
                  >
                    <Camera size={14} /> Bật Camera ngay
                  </button>
                </div>
              )}

              {/* In-game live gesture guidance overlays */}
              {gameState === 'PLAYING' && settings.showGestureHints && (
                <>
                  {/* Live Finger Detection Badge & Hold progress */}
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-2xl text-white text-xs font-bold flex items-center gap-2 border border-white/20">
                      {detectedGesture ? (
                        <>
                          <span className="text-base">{FINGER_ICONS[detectedGesture.optionIdx]}</span>
                          <span>Đang chọn {detectedGesture.letter}</span>
                          {holdProgress > 0 && (
                            <div className="w-16 bg-white/30 h-2 rounded-full overflow-hidden ml-1">
                              <div 
                                className="bg-pink-400 h-full transition-all duration-75"
                                style={{ width: `${holdProgress}%` }}
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-zinc-300 text-[11px] flex items-center gap-1">
                          <Hand size={13} /> Giơ 1-4 ngón tay trước camera
                        </span>
                      )}
                    </div>

                    {/* Timed Mode Live Countdown Badge on Camera */}
                    {isTimedMode && (
                      <div className={`px-3 py-1.5 rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-md border backdrop-blur-md transition-all ${
                        timeRemaining <= 10
                          ? 'bg-red-500/90 text-white border-white/60 animate-pulse'
                          : timeRemaining <= totalTimeLimit * 0.3
                            ? 'bg-amber-500/90 text-white border-white/40'
                            : 'bg-black/60 text-amber-300 border-white/20'
                      }`}>
                        <Clock size={13} className={timeRemaining <= 10 ? 'animate-spin' : ''} />
                        <span>{Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}</span>
                        {timeRemaining <= 10 && <span className="bg-white text-red-600 text-[9px] px-1 rounded-sm font-black">GẤP!</span>}
                      </div>
                    )}

                    <button 
                      onClick={() => setShowFingerGuideModal(true)}
                      className="pointer-events-auto bg-white/90 text-pink-600 text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-sm border border-pink-100 flex items-center gap-1"
                    >
                      <HelpCircle size={12} /> Hướng dẫn
                    </button>
                  </div>

                  {/* Visual Finger overlays on sides */}
                  <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center pointer-events-none gap-2">
                    <div className="bg-white/95 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase flex items-center gap-1.5 shadow-md text-purple-600 backdrop-blur-sm">
                      <span>☝️ 1: A</span>
                      <span>•</span>
                      <span>✌️ 2: B</span>
                      {currentQuestion.options.length >= 3 && (
                        <>
                          <span>•</span>
                          <span>🤟 3: C</span>
                        </>
                      )}
                      {currentQuestion.options.length >= 4 && (
                        <>
                          <span>•</span>
                          <span>🖖 4: D</span>
                        </>
                      )}
                    </div>

                    {holdProgress > 0 && (
                      <div className="bg-pink-500 text-white px-3 py-1.5 rounded-2xl text-[10px] font-black flex items-center gap-1 shadow-md animate-pulse">
                        <span>Giữ yên để chốt ({holdProgress}%)</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </section>

        {/* RIGHT COLUMN: MAIN INTERACTION SCREEN */}
        <section className="min-h-[450px]">
          <AnimatePresence mode="wait">
            
            {/* START SCREEN */}
            {gameState === 'START' && (
              <motion.div 
                key="start" 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                exit={{ y: -20, opacity: 0 }} 
                className="cute-card p-8 md:p-10"
              >
                <div className="flex justify-center mb-6">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.08, 1] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="relative"
                  >
                    <img 
                      src="https://upload.wikimedia.org/wikipedia/en/0/05/Hello_kitty_character_portrait.png" 
                      alt="Hello Kitty Welcome" 
                      className="w-32 h-32 object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -top-2 -right-2 text-soft-yellow"
                    >
                      <Star fill="currentColor" />
                    </motion.div>
                  </motion.div>
                </div>

                <h2 className="text-2xl md:text-3xl font-black text-center text-zinc-800 mb-2">
                  Chào mừng bạn đến với Ms Mèo! ✨
                </h2>
                <p className="text-center text-zinc-500 text-sm font-medium mb-6">
                  Trò chơi trắc nghiệm 4 đáp án nhận diện cử chỉ 1, 2, 3, 4 ngón tay vui nhộn cùng AI
                </p>

                {/* Finger quick tip banner */}
                <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3.5 mb-6 text-xs text-purple-800 font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🖐️</span>
                    <span>Hỗ trợ cử chỉ 4 ngón tay: ☝️ A • ✌️ B • 🤟 C • 🖖 D</span>
                  </div>
                  <button 
                    onClick={() => setShowFingerGuideModal(true)}
                    className="text-purple-600 underline font-black text-[11px]"
                  >
                    Xem hướng dẫn
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Standard Play */}
                  <button 
                    onClick={() => startStandardGame()}
                    className="w-full bg-pink-400 hover:bg-pink-500 text-white font-black py-4 rounded-2xl text-base shadow-lg shadow-pink-200 cute-button flex items-center justify-center gap-2"
                  >
                    <Play size={20} /> Bắt đầu chơi bằng Camera 🎮
                  </button>

                  {/* Timed Challenge Button */}
                  <button 
                    onClick={() => setShowTimedConfigModal(true)}
                    className="w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-white font-black py-4 rounded-2xl text-base shadow-lg shadow-amber-200 cute-button flex items-center justify-between px-5 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="bg-white/20 p-1.5 rounded-xl">
                        <Timer size={20} className="text-yellow-100 group-hover:rotate-12 transition-transform" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <span>Thử thách thời gian</span>
                          <span className="bg-yellow-300 text-amber-900 text-[10px] font-black px-2 py-0.2 rounded-full uppercase">Săn Vàng 🥇</span>
                        </div>
                        <div className="text-[11px] text-amber-100 font-medium font-sans">
                          Trả lời đúng tất cả trong thời gian giới hạn để nhận Huy chương Vàng
                        </div>
                      </div>
                    </div>
                    {goldMedalsCount > 0 ? (
                      <span className="bg-white/25 text-white text-xs font-black px-2.5 py-1 rounded-xl shrink-0 border border-white/30">
                        🥇 x{goldMedalsCount}
                      </span>
                    ) : (
                      <ChevronRight size={18} className="text-yellow-100" />
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => startPractice()}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl text-sm shadow-md shadow-emerald-100 cute-button flex items-center justify-center gap-2"
                    >
                      <GraduationCap size={18} /> Chế độ Luyện tập 📖
                    </button>
                    <button 
                      onClick={() => setGameState('LIBRARY')}
                      className="bg-white hover:bg-pink-50 text-pink-500 border-2 border-pink-100 font-bold py-3.5 rounded-2xl text-sm shadow-xs cute-button flex items-center justify-center gap-2"
                    >
                      <BookOpen size={18} /> Thư viện câu hỏi 📚
                    </button>
                  </div>

                  <button 
                    onClick={() => {
                      setAiError(null);
                      setAiGeneratedSet(null);
                      setShowAiModal(true);
                    }}
                    className="w-full bg-gradient-to-r from-purple-500 via-pink-400 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-black py-3.5 rounded-2xl text-sm shadow-md shadow-purple-100 cute-button flex items-center justify-center gap-2"
                  >
                    <Sparkles size={18} /> Tạo câu hỏi mới với Ms Mèo AI ✨
                  </button>
                </div>
              </motion.div>
            )}

            {/* LIBRARY SCREEN */}
            {gameState === 'LIBRARY' && (
              <motion.div 
                key="library" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }} 
                className="cute-card p-6 md:p-8"
              >
                <div className="flex justify-between items-center mb-6 pb-3 border-b border-pink-100">
                  <div className="flex items-center gap-3">
                    <div className="bg-pink-100 p-2.5 rounded-2xl text-pink-500">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-zinc-800">Thư viện câu hỏi</h2>
                      <p className="text-xs text-zinc-400 font-bold">Chọn hoặc tạo bộ câu hỏi trắc nghiệm của bạn</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setAiError(null);
                        setAiGeneratedSet(null);
                        setAiInputMode('templates');
                        setShowAiModal(true);
                      }} 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm cute-button"
                    >
                      <Zap size={14} className="fill-white" /> Tạo siêu tốc (0s & AI)
                    </button>
                    <button 
                      onClick={createNewSet} 
                      className="bg-pink-100 hover:bg-pink-200 text-pink-700 px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      <Plus size={16} /> Thủ công
                    </button>
                  </div>
                </div>

                <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                  {questionSets.map(set => (
                    <div 
                      key={set.id} 
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                        activeSetId === set.id 
                          ? 'border-pink-300 bg-pink-50/60 shadow-xs' 
                          : 'border-zinc-100 bg-white hover:border-pink-100'
                      }`}
                    >
                      <div className="cursor-pointer flex-1 mr-3" onClick={() => setActiveSetId(set.id)}>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-zinc-800 text-sm">{set.title}</h3>
                          {activeSetId === set.id && (
                            <span className="bg-pink-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full">Đang dùng</span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 font-medium line-clamp-1 mt-0.5">{set.description || 'Không có mô tả'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-pink-500 font-bold">{set.questions.length} câu</span>
                          <span className="text-[11px] text-purple-600 font-bold bg-purple-50 px-2 py-0.2 rounded-md">
                            {set.questions[0]?.options.length || 4} đáp án
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Timed Challenge Button */}
                        <button 
                          onClick={() => {
                            setActiveSetId(set.id);
                            startTimedChallenge(set.id);
                          }}
                          className="p-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                          title="Thử thách thời gian bộ câu hỏi này để săn Huy chương Vàng"
                        >
                          <Timer size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setActiveSetId(set.id);
                            startPractice(set.id);
                          }}
                          className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                          title="Luyện tập bộ câu hỏi này"
                        >
                          <GraduationCap size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingSet(set);
                            setGameState('EDITING');
                          }} 
                          className="p-2 rounded-xl bg-pink-50 text-pink-500 hover:bg-pink-100 transition-colors"
                          title="Chỉnh sửa câu hỏi"
                        >
                          <Edit3 size={16} />
                        </button>
                        {set.id !== 'default' && (
                          <button 
                            onClick={() => deleteSet(set.id)} 
                            className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
                            title="Xóa bộ câu hỏi"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-3 border-t border-pink-100 flex flex-wrap gap-2">
                  <button 
                    onClick={() => {
                      setAiError(null);
                      setAiGeneratedSet(null);
                      setAiInputMode('templates');
                      setShowAiModal(true);
                    }}
                    className="flex-1 min-w-[140px] bg-gradient-to-r from-purple-500 via-pink-400 to-pink-500 text-white py-3 rounded-2xl font-bold text-xs shadow-md cute-button flex items-center justify-center gap-1.5"
                  >
                    <Zap size={16} className="fill-white" /> Tạo siêu tốc (0s & AI)
                  </button>
                  <button 
                    onClick={() => startTimedChallenge()}
                    className="flex-1 min-w-[140px] bg-gradient-to-r from-amber-400 to-orange-400 text-white py-3 rounded-2xl font-bold text-xs shadow-md cute-button flex items-center justify-center gap-1.5"
                  >
                    <Timer size={16} /> Thử thách ⏱️
                  </button>
                  <button 
                    onClick={() => startStandardGame()} 
                    className="flex-1 min-w-[140px] bg-pink-400 text-white py-3 rounded-2xl font-bold text-xs shadow-md cute-button flex items-center justify-center gap-1.5"
                  >
                    <Play size={16} /> Chơi thường 🎮
                  </button>
                </div>
              </motion.div>
            )}

            {/* EDITING SCREEN (Library Editor) */}
            {gameState === 'EDITING' && editingSet && (
              <motion.div key="editing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="cute-card p-6 md:p-8">
                <div className="flex justify-between items-center mb-6 pb-3 border-b border-pink-100">
                  <h2 className="text-xl font-black text-zinc-800">Chỉnh sửa bộ câu hỏi</h2>
                  <label className="bg-pink-50 text-pink-500 hover:bg-pink-100 px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors">
                    {processingFile ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    <span>Tải tệp (.docx, .txt, .pdf)</span>
                    <input type="file" accept=".txt,.docx,.pdf,image/*" className="hidden" onChange={handleFileUpload} disabled={processingFile} />
                  </label>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-xs font-bold text-zinc-400 block mb-1">Tên bộ câu hỏi:</label>
                    <input 
                      value={editingSet.title} 
                      onChange={(e) => setEditingSet({...editingSet, title: e.target.value})} 
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 font-bold text-sm outline-none focus:border-pink-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-400 block mb-1">Mô tả:</label>
                    <input 
                      value={editingSet.description || ''} 
                      onChange={(e) => setEditingSet({...editingSet, description: e.target.value})} 
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-pink-300"
                    />
                  </div>
                </div>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                  {editingSet.questions.map((q, idx) => (
                    <motion.div key={q.id} className="p-4 bg-zinc-50/70 rounded-2xl border border-zinc-100 relative">
                      <button 
                        onClick={() => setEditingSet({...editingSet, questions: editingSet.questions.filter(item => item.id !== q.id)})} 
                        className="absolute -top-2 -right-2 bg-white p-1.5 rounded-full text-red-400 shadow-sm border border-red-50 hover:bg-red-50 transition-colors"
                        title="Xóa câu hỏi này"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="mb-3">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Câu hỏi {idx + 1}</label>
                        <input 
                          value={q.question} 
                          onChange={(e) => updateQuestion(q.id, 'question', e.target.value)} 
                          className="w-full bg-white rounded-xl px-4 py-2 border-2 border-pink-50 focus:border-pink-200 outline-none font-bold text-sm transition-colors" 
                        />
                      </div>

                      <div className="mb-3">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Hình ảnh (Tùy chọn)</label>
                        <div className="flex items-center gap-3">
                          {q.image ? (
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-pink-100">
                              <img src={q.image} className="w-full h-full object-cover" alt="Question" />
                              <button onClick={() => removeQuestionImage(q.id)} className="absolute top-0 right-0 bg-red-400 text-white p-1 rounded-bl-lg"><Trash2 size={10} /></button>
                            </div>
                          ) : (
                            <label className="w-16 h-16 rounded-xl border-2 border-dashed border-pink-100 flex flex-col items-center justify-center text-pink-300 cursor-pointer hover:bg-pink-50 transition-colors">
                              <Plus size={16} />
                              <span className="text-[7px] font-bold uppercase">Thêm ảnh</span>
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleQuestionImageUpload(q.id, e)} />
                            </label>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 block">
                          Các đáp án (Tích chọn đáp án đúng):
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-pink-50">
                              <input 
                                type="radio" 
                                name={`correct-${q.id}`}
                                checked={q.correctIndex === oIdx} 
                                onChange={() => updateQuestion(q.id, 'correctIndex', oIdx)} 
                                className="accent-pink-400 w-4 h-4 cursor-pointer" 
                                title="Chọn làm đáp án đúng"
                              />
                              <span className="text-xs font-black text-pink-400 w-6">
                                {FINGER_ICONS[oIdx]} {OPTION_LETTERS[oIdx]}:
                              </span>
                              <input 
                                value={opt} 
                                onChange={(e) => updateOption(q.id, oIdx, e.target.value)} 
                                className="w-full bg-transparent outline-none text-xs font-medium" 
                              />
                              {q.options.length > 2 && (
                                <button 
                                  type="button"
                                  onClick={() => removeOptionFromQuestion(q.id, oIdx)}
                                  className="text-zinc-300 hover:text-red-400 p-1"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {q.options.length < 4 && (
                          <button
                            type="button"
                            onClick={() => addOptionToQuestion(q.id)}
                            className="text-[11px] text-pink-500 font-bold hover:underline flex items-center gap-1 mt-1"
                          >
                            <Plus size={12} /> Thêm đáp án ({OPTION_LETTERS[q.options.length]})
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setGameState('LIBRARY')} className="flex-1 py-3 rounded-2xl font-bold text-xs text-zinc-400 hover:bg-zinc-50 transition-colors">Hủy</button>
                  <button onClick={handleSaveQuestions} className="flex-[2] bg-pink-400 text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-pink-100 cute-button"><Save size={16} /> Lưu bộ câu hỏi</button>
                </div>
              </motion.div>
            )}

            {/* PLAYING SCREEN */}
            {gameState === 'PLAYING' && (
              <motion.div key="playing" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">
                {/* Timed Mode Top Status Bar */}
                {isTimedMode && (
                  <motion.div 
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 p-4 rounded-3xl border-2 border-amber-200 shadow-sm relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs uppercase">
                          <Zap size={12} fill="currentColor" /> Thử thách thời gian
                        </span>
                        <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                          <Award size={14} className="text-amber-500" /> Săn Huy chương Vàng 🥇
                        </span>
                      </div>
                      <div className={`font-black text-lg md:text-xl font-mono px-3 py-1 rounded-xl border flex items-center gap-1.5 transition-all shadow-2xs ${
                        timeRemaining <= 10 
                          ? 'bg-red-500 text-white border-red-600 animate-bounce' 
                          : timeRemaining <= totalTimeLimit * 0.3
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-white text-amber-950 border-amber-200'
                      }`}>
                        <Clock size={16} className={timeRemaining <= 10 ? 'animate-spin' : ''} />
                        <span>{Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}</span>
                      </div>
                    </div>
                    
                    {/* Animated progress bar */}
                    <div className="w-full bg-amber-200/60 h-2.5 rounded-full overflow-hidden p-0.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          timeRemaining / totalTimeLimit <= 0.2
                            ? 'bg-gradient-to-r from-red-500 to-rose-500'
                            : timeRemaining / totalTimeLimit <= 0.4
                              ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                              : 'bg-gradient-to-r from-emerald-400 to-teal-400'
                        }`}
                        style={{ width: `${Math.max(0, Math.min(100, (timeRemaining / totalTimeLimit) * 100))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-amber-800 font-bold mt-1.5">
                      <span>Mục tiêu: Trả lời đúng 100% tất cả câu hỏi!</span>
                      <span>Còn {timeRemaining}s / {totalTimeLimit}s</span>
                    </div>
                  </motion.div>
                )}

                <div className="cute-card p-6 md:p-8">
                  <div className="flex justify-between items-center mb-3">
                    <div className="bg-pink-100 text-pink-500 text-xs font-black px-3 py-1 rounded-full uppercase">
                      Câu {currentQuestionIdx + 1} / {questions.length}
                    </div>
                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                      Cử chỉ: Giơ {currentQuestion.options.length} ngón tay tương ứng
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold text-zinc-800 leading-tight mb-4">
                    {currentQuestion.question}
                  </h2>

                  {currentQuestion.image && (
                    <div className="w-full max-h-48 rounded-2xl overflow-hidden mb-4 border-4 border-white shadow-sm">
                      <img src={currentQuestion.image} className="w-full h-full object-contain bg-zinc-50" alt="Question" />
                    </div>
                  )}
                </div>

                {/* Options Grid (2 or 4 options) */}
                <div className={`grid gap-3.5 ${currentQuestion.options.length === 4 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                  {currentQuestion.options.map((opt, idx) => (
                    <motion.div 
                      key={idx} 
                      whileHover={{ scale: selectedOption === idx ? 1.03 : 1.01, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      animate={{ 
                        scale: selectedOption === idx ? [1.02, 1.04, 1.02] : 1,
                        backgroundColor: selectedOption === idx ? "#FFB7CE" : "#FFFFFF",
                        color: selectedOption === idx ? "#FFFFFF" : "#52525b",
                        boxShadow: selectedOption === idx ? "0 12px 25px -5px rgba(255, 183, 206, 0.45)" : "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
                      }} 
                      transition={{ 
                        scale: selectedOption === idx ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : { type: "spring", stiffness: 300, damping: 20 },
                        backgroundColor: { duration: 0.2 },
                        color: { duration: 0.2 }
                      }}
                      className={`p-4 md:p-5 rounded-[2rem] font-bold text-base md:text-lg flex justify-between items-center border-2 transition-all cursor-pointer relative overflow-hidden ${
                        selectedOption === idx ? 'border-pink-200' : 'border-pink-50'
                      }`}
                      onClick={() => setSelectedOption(idx)}
                    >
                      {/* Hold progress filling background */}
                      {selectedOption === idx && holdProgress > 0 && (
                        <div 
                          className="absolute inset-y-0 left-0 bg-pink-400/30 transition-all duration-75 pointer-events-none"
                          style={{ width: `${holdProgress}%` }}
                        />
                      )}

                      <div className="flex items-center gap-3 relative z-10">
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                          selectedOption === idx ? 'bg-white text-pink-400' : 'bg-pink-50 text-pink-500'
                        }`}>
                          {OPTION_LETTERS[idx]}
                        </span>
                        <div>
                          <div className="text-[10px] font-black uppercase text-pink-600/80 mb-0.5">
                            {FINGER_ICONS[idx]} {idx + 1} ngón tay
                          </div>
                          <span>{opt}</span>
                        </div>
                      </div>

                      {selectedOption === idx && (
                        <motion.div 
                          layoutId="cute-cursor" 
                          animate={{ rotate: [0, 15, -15, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="bg-white p-1 rounded-full text-soft-pink shadow-sm relative z-10"
                        >
                          <Heart size={16} fill="currentColor" />
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Confirm button */}
                <div className="flex flex-col items-center gap-2 pt-2">
                  <button
                    onClick={handleConfirm}
                    className="bg-pink-400 hover:bg-pink-500 text-white font-bold py-3.5 px-8 rounded-2xl text-sm shadow-md cute-button flex items-center gap-2"
                  >
                    <CheckCircle2 size={18} /> Xác nhận đáp án (hoặc giữ yên ngón tay 1.3s)
                  </button>
                  <span className="text-[11px] text-zinc-400 font-semibold">
                    💡 Mẹo: Bạn có thể giơ ngón tay giữ yên trước camera, hoặc bấm trực tiếp vào thẻ đáp án!
                  </span>
                </div>
              </motion.div>
            )}

            {/* RESULT SCREEN */}
            {gameState === 'RESULT' && (
              <motion.div 
                key="result" 
                initial={{ scale: 0.85, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                className={`rounded-[2.5rem] p-8 md:p-10 shadow-2xl flex flex-col items-center text-center border-4 border-white relative overflow-hidden ${
                  selectedOption === currentQuestion.correctIndex 
                    ? 'bg-gradient-to-b from-green-50 to-emerald-50 shadow-green-100' 
                    : 'bg-gradient-to-b from-rose-50 to-pink-50 shadow-red-100'
                }`}
              >
                {selectedOption === currentQuestion.correctIndex ? (
                  <>
                    <motion.div 
                      animate={{ scale: [1, 1.15, 1], rotate: [0, 6, -6, 0] }} 
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="bg-white p-4 rounded-full shadow-lg mb-5 w-28 h-28 flex items-center justify-center overflow-hidden"
                    >
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/en/0/05/Hello_kitty_character_portrait.png" 
                        alt="Happy Kitty" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>

                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={24} className="text-yellow-400 animate-spin" />
                      <h2 className="text-3xl md:text-4xl font-black text-green-500">Tuyệt vời! 🌟</h2>
                      <Sparkles size={24} className="text-yellow-400 animate-spin" />
                    </div>

                    <p className="text-green-700 font-bold text-base mb-1">
                      Ms Mèo rất vui vì bạn đã trả lời chính xác!
                    </p>
                    
                    {currentQuestion.explanation && (
                      <p className="text-xs text-green-600 bg-white/70 px-4 py-2 rounded-xl mt-2 max-w-md">
                        💡 {currentQuestion.explanation}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <motion.div 
                      animate={{ x: [-4, 4, -4] }} 
                      transition={{ repeat: Infinity, duration: 0.5 }}
                      className="bg-white p-4 rounded-full shadow-lg mb-5 w-28 h-28 flex items-center justify-center overflow-hidden grayscale"
                    >
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/en/0/05/Hello_kitty_character_portrait.png" 
                        alt="Sad Kitty" 
                        className="w-full h-full object-contain opacity-70"
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>

                    <h2 className="text-3xl md:text-4xl font-black text-rose-500 mb-2">Chưa chính xác rồi! 🥺</h2>
                    <p className="text-rose-700 font-bold mb-1">Cố gắng ở câu sau nhé!</p>
                    <p className="text-zinc-600 font-medium text-sm">
                      Đáp án đúng là: <span className="underline font-bold text-green-600">
                        {OPTION_LETTERS[currentQuestion.correctIndex]}. {currentQuestion.options[currentQuestion.correctIndex]}
                      </span>
                    </p>
                    {currentQuestion.explanation && (
                      <p className="text-xs text-rose-600 bg-white/70 px-4 py-2 rounded-xl mt-2 max-w-md">
                        💡 {currentQuestion.explanation}
                      </p>
                    )}
                  </>
                )}

                <div className="mt-8 flex flex-col items-center gap-3">
                  <button 
                    onClick={handleNext}
                    className="bg-pink-400 hover:bg-pink-500 text-white px-8 py-3.5 rounded-2xl font-bold text-base shadow-lg shadow-pink-200 cute-button flex items-center gap-2.5"
                  >
                    {currentQuestionIdx < questions.length - 1 ? 'Câu tiếp theo' : 'Xem tổng kết điểm'} 
                    <ChevronRight size={18} />
                  </button>
                  <div className="flex items-center gap-2 text-zinc-400 font-bold text-xs animate-pulse">
                    <Hand size={14} /> Hoặc giơ ngón tay trước camera / bấm phím Space để tiếp tục
                  </div>
                </div>
              </motion.div>
            )}

            {/* PRACTICE MODE (RIGHT COLUMN) */}
            {gameState === 'PRACTICE' && (
              <motion.div 
                key="practice" 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -20 }} 
                className="space-y-6"
              >
                {practiceViewMode === 'card' ? (
                  <>
                    <div className="cute-card p-6 md:p-8">
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="bg-pink-100 text-pink-600 text-xs font-black px-3 py-1 rounded-full uppercase">
                            Câu {currentQuestionIdx + 1} / {questions.length}
                          </span>
                          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                            <GraduationCap size={14} /> Ôn tập
                          </span>
                        </div>
                        <span className="text-xs text-zinc-400 font-bold hidden sm:inline">Không tính điểm</span>
                      </div>

                      <h2 className="text-2xl md:text-3xl font-bold text-zinc-800 leading-tight mb-4">
                        {currentQuestion.question}
                      </h2>

                      {currentQuestion.image && (
                        <div className="w-full max-h-52 rounded-2xl overflow-hidden mb-5 border-4 border-white shadow-sm">
                          <img src={currentQuestion.image} className="w-full h-full object-contain bg-zinc-50" alt="Question" />
                        </div>
                      )}

                      {/* Mode description hint */}
                      {practiceAlwaysShowAnswer ? (
                        <div className="text-xs text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-2xl mb-5 font-bold flex items-center gap-2 border border-emerald-100">
                          <Sparkles size={16} className="text-emerald-500 shrink-0" />
                          <span>Đáp án đúng được đánh dấu nổi bật với ký hiệu <strong>#</strong> và viền xanh:</span>
                        </div>
                      ) : (
                        <div className="text-xs text-pink-600 bg-pink-50 px-4 py-2.5 rounded-2xl mb-5 font-bold flex items-center gap-2 border border-pink-100">
                          <Sparkles size={16} className="text-pink-400 shrink-0" />
                          <span>Chế độ tự thử sức: Hãy bấm vào đáp án A, B, C, D để kiểm tra kết quả ngay!</span>
                        </div>
                      )}

                      {/* Options */}
                      <div className={`grid gap-3.5 ${currentQuestion.options.length === 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                        {currentQuestion.options.map((opt, idx) => {
                          const isCorrect = idx === currentQuestion.correctIndex;
                          const isSelected = practiceSelectedOption === idx;

                          let containerStyle = "p-4 rounded-[2rem] font-bold text-base flex items-center justify-between border-2 transition-all ";

                          if (practiceAlwaysShowAnswer) {
                            if (isCorrect) {
                              containerStyle += "bg-emerald-50/80 border-emerald-300 text-emerald-800 shadow-md shadow-emerald-50";
                            } else {
                              containerStyle += "bg-white border-zinc-100 text-zinc-600 hover:bg-zinc-50/50";
                            }
                          } else {
                            if (isSelected) {
                              if (isCorrect) {
                                containerStyle += "bg-emerald-50 border-emerald-400 text-emerald-800 shadow-md shadow-emerald-100";
                              } else {
                                containerStyle += "bg-rose-50 border-rose-300 text-rose-700 shadow-md shadow-rose-100";
                              }
                            } else {
                              containerStyle += "bg-white border-pink-50 hover:border-pink-200 text-zinc-700 cursor-pointer shadow-xs";
                            }
                          }

                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                if (!practiceAlwaysShowAnswer) {
                                  setPracticeSelectedOption(idx);
                                }
                              }}
                              className={containerStyle}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                                  (practiceAlwaysShowAnswer && isCorrect) || (isSelected && isCorrect)
                                    ? 'bg-emerald-500 text-white shadow-xs'
                                    : isSelected && !isCorrect
                                      ? 'bg-rose-400 text-white shadow-xs'
                                      : 'bg-zinc-100 text-zinc-600'
                                }`}>
                                  {OPTION_LETTERS[idx]}
                                </span>
                                <div>
                                  <div className="text-[10px] text-zinc-400 font-bold">
                                    {FINGER_ICONS[idx]} {idx + 1} ngón
                                  </div>
                                  <span className="font-bold">
                                    {isCorrect && practiceAlwaysShowAnswer ? `# ${opt}` : opt}
                                  </span>
                                </div>
                              </div>

                              <div className="shrink-0">
                                {practiceAlwaysShowAnswer && isCorrect && (
                                  <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-black flex items-center gap-1 shadow-2xs">
                                    <Check size={12} /> Đúng
                                  </span>
                                )}
                                {!practiceAlwaysShowAnswer && isSelected && (
                                  isCorrect ? (
                                    <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-black flex items-center gap-1 shadow-2xs">
                                      <Check size={12} /> Đúng! 🌟
                                    </span>
                                  ) : (
                                    <span className="bg-rose-100 text-rose-700 text-xs px-2.5 py-1 rounded-full font-black flex items-center gap-1 shadow-2xs">
                                      Sai 🥺
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation hint */}
                      {currentQuestion.explanation && (
                        <div className="mt-4 p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-amber-800 text-xs font-bold flex items-center gap-2">
                          <span>💡 {currentQuestion.explanation}</span>
                        </div>
                      )}
                    </div>

                    {/* Navigation bar for Practice Mode */}
                    <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-3xl shadow-sm border border-pink-100">
                      <button
                        disabled={currentQuestionIdx === 0}
                        onClick={() => {
                          setCurrentQuestionIdx(prev => Math.max(0, prev - 1));
                          setPracticeSelectedOption(null);
                        }}
                        className={`px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${
                          currentQuestionIdx === 0 
                            ? 'opacity-40 cursor-not-allowed bg-zinc-100 text-zinc-400' 
                            : 'bg-white border-2 border-pink-100 text-pink-500 hover:bg-pink-50 cute-button'
                        }`}
                      >
                        <ArrowLeft size={18} /> Câu trước
                      </button>

                      <div className="text-center">
                        <span className="text-xs font-black text-pink-500">
                          {currentQuestionIdx + 1} / {questions.length}
                        </span>
                        <div className="text-[10px] font-bold text-zinc-400 hidden sm:block">
                          Dùng phím ← → hoặc 1, 2, 3, 4
                        </div>
                      </div>

                      <button
                        disabled={currentQuestionIdx === questions.length - 1}
                        onClick={() => {
                          setCurrentQuestionIdx(prev => Math.min(questions.length - 1, prev + 1));
                          setPracticeSelectedOption(null);
                        }}
                        className={`px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${
                          currentQuestionIdx === questions.length - 1 
                            ? 'opacity-40 cursor-not-allowed bg-zinc-100 text-zinc-400' 
                            : 'bg-pink-400 text-white shadow-md shadow-pink-100 hover:bg-pink-500 cute-button'
                        }`}
                      >
                        Câu tiếp theo <ArrowRight size={18} />
                      </button>
                    </div>
                  </>
                ) : (
                  /* List view for all questions */
                  <div className="cute-card p-6 md:p-8 max-h-[650px] overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-pink-100">
                      <div>
                        <h3 className="text-xl font-black text-zinc-800">Bảng Ôn Tập Toàn Bộ Đề 📚</h3>
                        <p className="text-xs text-zinc-400 font-bold">Xem tất cả {questions.length} câu hỏi và đáp án đúng</p>
                      </div>
                      <button
                        onClick={() => setPracticeViewMode('card')}
                        className="text-xs bg-pink-100 text-pink-600 px-3 py-2 rounded-xl font-bold hover:bg-pink-200 transition-colors"
                      >
                        Thu về dạng thẻ
                      </button>
                    </div>

                    <div className="space-y-4">
                      {questions.map((q, qIndex) => (
                        <div key={q.id || qIndex} className="p-4 bg-zinc-50/80 rounded-2xl border border-zinc-100">
                          <div className="flex items-start gap-2 mb-2">
                            <span className="bg-pink-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                              Câu {qIndex + 1}
                            </span>
                            <span className="text-sm font-bold text-zinc-800 leading-snug">{q.question}</span>
                          </div>

                          {q.image && (
                            <img src={q.image} alt="" className="w-24 h-24 object-contain rounded-xl my-2 border border-pink-100 bg-white" />
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = optIdx === q.correctIndex;
                              return (
                                <div
                                  key={optIdx}
                                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between border ${
                                    isCorrect 
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs' 
                                      : 'bg-white border-zinc-100 text-zinc-500'
                                  }`}
                                >
                                  <span>
                                    {OPTION_LETTERS[optIdx]}. {isCorrect ? `# ${opt}` : opt}
                                  </span>
                                  {isCorrect && (
                                    <span className="bg-emerald-200/80 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-0.5">
                                      <Check size={12} /> Đúng
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-pink-100 flex flex-col sm:flex-row justify-between items-center gap-3">
                      <button
                        onClick={() => setPracticeViewMode('card')}
                        className="text-xs text-zinc-500 hover:text-pink-500 font-bold"
                      >
                        ← Quay lại dạng từng câu
                      </button>
                      <button
                        onClick={() => { resetGame(); startCamera(); }}
                        className="bg-pink-400 hover:bg-pink-500 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-md cute-button flex items-center gap-2"
                      >
                        <Gamepad2 size={16} /> Bắt đầu chơi bằng Camera
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* FINISHED SCREEN */}
            {gameState === 'FINISHED' && (
              <motion.div 
                key="finished" 
                initial={{ y: 30, opacity: 0, scale: 0.9 }} 
                animate={{ y: 0, opacity: 1, scale: 1 }} 
                className={`bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl text-center border-4 relative overflow-hidden max-h-[85vh] overflow-y-auto custom-scrollbar ${
                  timedOut 
                    ? 'border-red-200 shadow-red-100'
                    : earnedGoldMedal
                      ? 'border-amber-300 shadow-amber-100 bg-gradient-to-b from-yellow-50/50 via-white to-amber-50/30'
                      : 'border-pink-50 shadow-pink-100'
                }`}
              >
                {/* 1. TIMED OUT STATE */}
                {timedOut ? (
                  <>
                    <div className="relative inline-block mb-4">
                      <motion.div
                        animate={{ rotate: [-6, 6, -6], scale: [1, 1.05, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="w-28 h-28 flex items-center justify-center mx-auto bg-red-100 rounded-full border-4 border-red-300 shadow-md"
                      >
                        <Clock size={60} className="text-red-500 animate-pulse" />
                      </motion.div>
                      <span className="absolute -top-1 -right-1 text-2xl">⏰</span>
                    </div>

                    <div className="inline-block bg-red-500 text-white font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider mb-2 shadow-xs">
                      Hết Giờ Làm Bài ⏰
                    </div>
                    <h2 className="text-3xl font-black text-zinc-800 mb-2">Đã hết thời gian! ⏱️💥</h2>
                    <p className="text-zinc-500 text-sm font-medium mb-6 max-w-md mx-auto">
                      Đồng hồ thử thách đã điểm 00:00! Bạn đã kịp trả lời đúng <strong className="text-red-500">{score}/{questions.length}</strong> câu hỏi. Hãy rèn luyện phản xạ cử chỉ và thử lại để chinh phục Huy chương Vàng nhé!
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-6 max-w-sm mx-auto">
                      <div className="bg-green-50 p-4 rounded-2xl border border-green-200">
                        <div className="text-green-600 font-black text-3xl">{score}</div>
                        <div className="text-green-700 text-xs font-bold uppercase">Câu đã đúng</div>
                      </div>
                      <div className="bg-red-50 p-4 rounded-2xl border border-red-200">
                        <div className="text-red-500 font-black text-3xl">{totalTimeLimit}s</div>
                        <div className="text-red-600 text-xs font-bold uppercase">Thời gian đã dùng</div>
                      </div>
                    </div>

                    {/* Notebook Icon to view details */}
                    <div className="flex justify-center mb-6">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setGameState('DETAILS')}
                        className="flex flex-col items-center gap-1.5 group cursor-pointer"
                        title="Bấm vào quyển vở để xem chi tiết câu đúng sai"
                      >
                        <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-200 shadow-sm group-hover:bg-blue-100 transition-colors">
                          <BookOpen size={36} className="text-blue-500" />
                        </div>
                        <span className="text-blue-500 font-bold text-xs group-hover:underline">Xem lại câu hỏi 📖</span>
                      </motion.button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button 
                        onClick={() => startTimedChallenge()} 
                        className="bg-gradient-to-r from-amber-400 to-orange-400 text-white px-8 py-3.5 rounded-2xl font-bold text-base shadow-md shadow-amber-200 cute-button flex items-center justify-center gap-2"
                      >
                        <Timer size={18} /> Thử thách lại ngay ⚡
                      </button>
                      <button 
                        onClick={() => startStandardGame()} 
                        className="bg-pink-400 text-white px-6 py-3.5 rounded-2xl font-bold text-base shadow-md shadow-pink-200 cute-button flex items-center justify-center gap-2"
                      >
                        <Play size={18} /> Chơi thường (Không giới hạn)
                      </button>
                      <button 
                        onClick={() => { stopCamera(); setGameState('START'); }} 
                        className="bg-white text-zinc-500 border-2 border-zinc-200 px-6 py-3.5 rounded-2xl font-bold text-base shadow-xs cute-button flex items-center justify-center gap-2"
                      >
                        <Home size={18} /> Trang chủ
                      </button>
                    </div>
                  </>
                ) : earnedGoldMedal ? (
                  /* 2. GOLD MEDAL WON! */
                  <>
                    <div className="relative inline-block mb-4">
                      {/* Radiant Background Aura */}
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                        className="absolute -inset-6 bg-gradient-to-r from-yellow-300/30 via-amber-400/20 to-yellow-300/30 rounded-full blur-xl pointer-events-none"
                      />

                      <motion.div
                        animate={{ y: [0, -10, 0], scale: [1, 1.08, 1] }}
                        transition={{ repeat: Infinity, duration: 2.5 }}
                        className="w-32 h-32 flex items-center justify-center mx-auto relative z-10"
                      >
                        <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-200 p-1 shadow-2xl border-4 border-yellow-200 flex items-center justify-center">
                          <div className="w-full h-full rounded-full bg-gradient-to-b from-yellow-100 to-amber-100 flex flex-col items-center justify-center text-amber-900 border-2 border-amber-400/60 shadow-inner">
                            <Award size={48} className="text-yellow-600 drop-shadow-sm" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 -mt-1">Ms Mèo 1st</span>
                          </div>
                        </div>
                      </motion.div>
                      <motion.div 
                        animate={{ rotate: 360, scale: [1, 1.2, 1] }} 
                        transition={{ repeat: Infinity, duration: 4 }} 
                        className="absolute -top-2 -right-2 text-yellow-400 z-20"
                      >
                        <Sparkles size={36} />
                      </motion.div>
                    </div>

                    <div className="inline-block bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 text-amber-950 font-black text-xs px-4 py-1.5 rounded-full uppercase tracking-wider mb-2 shadow-sm border border-yellow-200">
                      🥇 HUY CHƯƠNG VÀNG THỜI GIAN
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-amber-900 mb-1">
                      XUẤT SẮC ĐẠT HUY CHƯƠNG VÀNG! 🥇
                    </h2>
                    <div className="text-base font-bold text-amber-700 mb-6">
                      Bạn đã hoàn thành 100% câu hỏi trong thời gian kỷ lục! ✨
                    </div>

                    {/* Speedrun Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 max-w-2xl mx-auto">
                      <div className="bg-amber-50/80 p-4 rounded-2xl border-2 border-amber-200 shadow-2xs">
                        <div className="text-amber-800 font-black text-2xl font-mono">
                          {goldMedalStats?.timeUsed || (totalTimeLimit - timeRemaining)}s
                        </div>
                        <div className="text-amber-700 text-[10px] font-black uppercase mt-0.5">Thời gian hoàn thành</div>
                      </div>
                      <div className="bg-emerald-50/80 p-4 rounded-2xl border-2 border-emerald-200 shadow-2xs">
                        <div className="text-emerald-700 font-black text-2xl font-mono">
                          {goldMedalStats?.remaining || timeRemaining}s
                        </div>
                        <div className="text-emerald-800 text-[10px] font-black uppercase mt-0.5">Thời gian còn dư</div>
                      </div>
                      <div className="bg-green-50/80 p-4 rounded-2xl border-2 border-green-200 shadow-2xs">
                        <div className="text-green-700 font-black text-2xl font-mono">
                          {score}/{questions.length}
                        </div>
                        <div className="text-green-800 text-[10px] font-black uppercase mt-0.5">Điểm tuyệt đối</div>
                      </div>
                      <div className="bg-yellow-50/80 p-4 rounded-2xl border-2 border-yellow-300 shadow-2xs">
                        <div className="text-yellow-700 font-black text-2xl font-mono">
                          x{goldMedalsCount} 🥇
                        </div>
                        <div className="text-yellow-800 text-[10px] font-black uppercase mt-0.5">Huy chương đã có</div>
                      </div>
                    </div>

                    {/* Notebook Icon to view details */}
                    <div className="flex justify-center mb-6">
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setGameState('DETAILS')}
                        className="flex flex-col items-center gap-1.5 group cursor-pointer"
                        title="Bấm vào quyển vở để xem chi tiết câu đúng sai"
                      >
                        <div className="bg-blue-50 p-4 rounded-2xl border-4 border-blue-200 shadow-md group-hover:bg-blue-100 transition-colors">
                          <BookOpen size={40} className="text-blue-500" />
                        </div>
                        <span className="text-blue-600 font-black text-xs group-hover:underline">Bấm xem chi tiết câu hỏi 📖</span>
                      </motion.button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button 
                        onClick={() => setGameState('CERTIFICATE')} 
                        className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-amber-950 px-8 py-3.5 rounded-2xl font-black text-base shadow-lg shadow-yellow-200 cute-button flex items-center justify-center gap-2 border border-yellow-300"
                      >
                        <Award size={20} /> Giấy chứng nhận Vàng 🥇
                      </button>
                      <button 
                        onClick={() => startTimedChallenge()} 
                        className="bg-amber-100 hover:bg-amber-200 text-amber-900 border-2 border-amber-300 px-6 py-3.5 rounded-2xl font-bold text-base shadow-xs cute-button flex items-center justify-center gap-2"
                      >
                        <Timer size={18} /> Thử thách tiếp ⚡
                      </button>
                      <button 
                        onClick={() => { stopCamera(); setGameState('START'); }} 
                        className="bg-white text-zinc-500 border-2 border-zinc-200 px-6 py-3.5 rounded-2xl font-bold text-base shadow-xs cute-button flex items-center justify-center gap-2"
                      >
                        <Home size={18} /> Trang chủ
                      </button>
                    </div>
                  </>
                ) : (
                  /* 3. STANDARD FINISHED OR TIMED COMPLETED WITHOUT 100% */
                  <>
                    <div className="relative inline-block mb-4">
                      <motion.div
                        animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 3 }}
                        className="w-28 h-28 flex items-center justify-center mx-auto"
                      >
                        <img 
                          src="https://upload.wikimedia.org/wikipedia/en/0/05/Hello_kitty_character_portrait.png" 
                          alt="Winner Kitty" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </motion.div>
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }} className="absolute -top-3 -right-3 text-soft-yellow">
                        <Trophy size={36} />
                      </motion.div>
                    </div>

                    <h2 className="text-3xl font-black text-zinc-800 mb-1">Chúc mừng! 🎉</h2>
                    <div className="text-lg font-bold text-pink-400 mb-2">
                      {isTimedMode 
                        ? 'Bạn đã hoàn thành thử thách trước khi hết giờ!' 
                        : 'Bạn và Ms Mèo đã hoàn thành thử thách!'}
                    </div>
                    
                    {/* Timed Mode Partial Score Notice */}
                    {isTimedMode && score < questions.length && (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl mb-4 text-xs font-bold text-amber-800 max-w-md mx-auto flex items-center gap-2">
                        <span className="text-xl">🥈</span>
                        <span>
                          Bạn đạt <strong>{score}/{questions.length}</strong> điểm. Để nhận <strong>Huy chương Vàng 🥇</strong>, hãy thử lại và trả lời đúng tất cả các câu hỏi nhé!
                        </span>
                      </div>
                    )}

                    {/* Rating Message */}
                    <motion.div 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`text-2xl font-black mb-6 ${
                        (score / questions.length) === 1 ? 'text-yellow-500' : 
                        (score / questions.length) >= 0.8 ? 'text-green-500' : 
                        (score / questions.length) >= 0.5 ? 'text-blue-500' : 'text-orange-500'
                      }`}
                    >
                      {(score / questions.length) === 1 ? 'XUẤT SẮC! 🏆' : 
                       (score / questions.length) >= 0.8 ? 'GIỎI QUÁ! 🌟' : 
                       (score / questions.length) >= 0.5 ? 'KHÁ LẮM! 👍' : 'CỐ GẮNG LÊN! 💪'}
                    </motion.div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <motion.div 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-green-50 p-5 rounded-[2rem] border-2 border-green-100 shadow-sm"
                      >
                        <div className="text-green-500 font-black text-4xl mb-0.5">{score}</div>
                        <div className="text-green-600 text-xs font-bold uppercase tracking-wider">Câu đúng</div>
                      </motion.div>
                      <motion.div 
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="bg-red-50 p-5 rounded-[2rem] border-2 border-red-100 shadow-sm"
                      >
                        <div className="text-red-500 font-black text-4xl mb-0.5">{questions.length - score}</div>
                        <div className="text-red-600 text-xs font-bold uppercase tracking-wider">Câu sai</div>
                      </motion.div>
                    </div>

                    {/* Challenge Banner suggestion for standard mode */}
                    {!isTimedMode && (
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3.5 mb-6 text-xs text-amber-800 font-semibold flex items-center justify-between max-w-md mx-auto">
                        <div className="flex items-center gap-2">
                          <Timer size={18} className="text-amber-500" />
                          <span>Muốn nhận Huy chương Vàng? Hãy thử Thử thách thời gian!</span>
                        </div>
                        <button 
                          onClick={() => startTimedChallenge()}
                          className="bg-amber-400 text-white font-bold text-[11px] px-3 py-1 rounded-xl shadow-2xs hover:bg-amber-500"
                        >
                          Chơi ngay ⚡
                        </button>
                      </div>
                    )}

                    {/* Notebook Icon to view details */}
                    <div className="flex justify-center mb-6">
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setGameState('DETAILS')}
                        className="flex flex-col items-center gap-2 group cursor-pointer"
                        title="Bấm vào quyển vở để xem chi tiết câu đúng sai"
                      >
                        <div className="bg-blue-50 p-5 rounded-[2.2rem] border-4 border-blue-200 shadow-md group-hover:bg-blue-100 transition-colors">
                          <BookOpen size={48} className="text-blue-500" />
                        </div>
                        <span className="text-blue-500 font-black text-sm group-hover:underline">Bấm xem chi tiết câu hỏi 📖</span>
                      </motion.button>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      {isTimedMode ? (
                        <button 
                          onClick={() => startTimedChallenge()} 
                          className="bg-gradient-to-r from-amber-400 to-orange-400 text-white px-8 py-3.5 rounded-2xl font-bold text-base shadow-md shadow-amber-200 cute-button flex items-center justify-center gap-2"
                        >
                          Săn lại Huy chương Vàng 🥇
                        </button>
                      ) : (
                        <button onClick={resetGame} className="bg-pink-400 text-white px-8 py-3.5 rounded-2xl font-bold text-base shadow-md shadow-pink-200 cute-button flex items-center justify-center gap-2">Chơi lại <RefreshCcw size={18} /></button>
                      )}
                      <button onClick={() => setGameState('CERTIFICATE')} className="bg-yellow-400 text-white px-8 py-3.5 rounded-2xl font-bold text-base shadow-md shadow-yellow-200 cute-button flex items-center justify-center gap-2">Giấy chứng nhận <Trophy size={18} /></button>
                      <button onClick={() => { stopCamera(); setGameState('START'); }} className="bg-white text-zinc-500 border-2 border-zinc-100 px-8 py-3.5 rounded-2xl font-bold text-base shadow-xs cute-button flex items-center justify-center gap-2">Trang chủ <Home size={18} /></button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* DETAILS SCREEN */}
            {gameState === 'DETAILS' && (
              <motion.div 
                key="details" 
                initial={{ x: 50, opacity: 0 }} 
                animate={{ x: 0, opacity: 1 }} 
                className="bg-white rounded-[3rem] p-6 md:p-10 shadow-2xl shadow-pink-100 border-2 border-pink-50 max-w-4xl mx-auto"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-blue-100 p-3 rounded-2xl">
                    <BookOpen size={28} className="text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-zinc-800">Kết quả chi tiết</h2>
                    <p className="text-zinc-500 text-xs font-bold">Xem lại toàn bộ câu hỏi và đáp án bạn đã chọn</p>
                  </div>
                </div>

                <div className="mb-6 overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm">
                  <div className="bg-pink-50 text-pink-500 font-bold uppercase text-[10px] px-6 py-3 flex items-center justify-between border-b border-pink-100">
                    <span>DANH SÁCH CÂU HỎI</span>
                    <span>{score}/{questions.length} ĐIỂM</span>
                  </div>
                  <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 text-zinc-400 font-bold uppercase text-[10px] sticky top-0 z-10">
                        <tr>
                          <th className="px-5 py-3">Câu hỏi</th>
                          <th className="px-5 py-3">Bạn chọn</th>
                          <th className="px-5 py-3">Đáp án đúng</th>
                          <th className="px-5 py-3">Kết quả</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-pink-50">
                        {userAnswers.map((ans, i) => (
                          <tr key={i} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-5 py-3 font-medium text-zinc-700">{ans.question}</td>
                            <td className={`px-5 py-3 font-bold ${ans.isCorrect ? 'text-green-500' : 'text-red-400'}`}>{ans.selected}</td>
                            <td className="px-5 py-3 font-bold text-green-500">{ans.correct}</td>
                            <td className="px-5 py-3">
                              {ans.isCorrect ? (
                                <span className="bg-green-100 text-green-600 px-2.5 py-1 rounded-xl text-xs font-black">ĐÚNG</span>
                              ) : (
                                <span className="bg-red-100 text-red-500 px-2.5 py-1 rounded-xl text-xs font-black">SAI</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button onClick={resetGame} className="bg-pink-400 text-white px-8 py-3.5 rounded-2xl font-bold text-sm shadow-md shadow-pink-200 cute-button flex items-center justify-center gap-2">Chơi lại <RefreshCcw size={16} /></button>
                  <button onClick={() => { stopCamera(); setGameState('START'); }} className="bg-white text-zinc-500 border-2 border-zinc-100 px-8 py-3.5 rounded-2xl font-bold text-sm shadow-xs cute-button flex items-center justify-center gap-2">Trang chủ <Home size={16} /></button>
                  <button onClick={() => setGameState('FINISHED')} className="bg-zinc-100 text-zinc-600 px-8 py-3.5 rounded-2xl font-bold text-sm shadow-xs cute-button flex items-center justify-center gap-2">Quay lại <ChevronRight size={16} className="rotate-180" /></button>
                </div>
              </motion.div>
            )}

            {/* CERTIFICATE SCREEN */}
            {gameState === 'CERTIFICATE' && (
              <motion.div
                key="certificate"
                initial={{ scale: 0.85, opacity: 0, rotate: -2 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.85, opacity: 0 }}
                className={`relative p-1 rounded-[3rem] shadow-2xl ${
                  earnedGoldMedal 
                    ? 'bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-200 shadow-yellow-200' 
                    : 'bg-gradient-to-br from-yellow-200 via-pink-200 to-yellow-200'
                }`}
              >
                <div className={`rounded-[2.8rem] p-6 md:p-10 border-4 border-double relative overflow-hidden text-center ${
                  earnedGoldMedal 
                    ? 'bg-gradient-to-b from-yellow-50/70 via-white to-amber-50/60 border-amber-400' 
                    : 'bg-white border-yellow-400'
                }`}>
                  <div className="relative z-10">
                    <div className="flex justify-center mb-4">
                      {earnedGoldMedal ? (
                        <div className="relative">
                          <div className="bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-200 p-4 rounded-full shadow-xl border-2 border-yellow-200">
                            <Award size={48} className="text-amber-900" />
                          </div>
                          <span className="absolute -bottom-1 -right-1 text-2xl">🥇</span>
                        </div>
                      ) : (
                        <div className="bg-yellow-400 p-3.5 rounded-full shadow-lg shadow-yellow-100">
                          <Trophy size={40} className="text-white" />
                        </div>
                      )}
                    </div>
                    
                    <h2 className={`text-2xl md:text-4xl font-black mb-1 tracking-tight ${
                      earnedGoldMedal ? 'text-amber-800' : 'text-pink-500'
                    }`}>
                      {earnedGoldMedal ? 'GIẤY CHỨNG NHẬN HUY CHƯƠNG VÀNG 🥇' : 'GIẤY CHỨNG NHẬN'}
                    </h2>
                    <p className={`font-bold uppercase tracking-widest text-xs mb-6 ${
                      earnedGoldMedal ? 'text-amber-700' : 'text-zinc-400'
                    }`}>
                      {earnedGoldMedal ? 'Thành tích xuất sắc - Thử thách thời gian' : 'Thành tích học tập xuất sắc'}
                    </p>
                    
                    <div className="mb-6">
                      <p className="text-zinc-500 italic text-sm mb-1">
                        {earnedGoldMedal 
                          ? 'Chứng nhận người chơi đã trả lời đúng 100% trong thời gian giới hạn cùng' 
                          : 'Chúc mừng bạn đã hoàn thành xuất sắc thử thách của'}
                      </p>
                      <h3 className="text-3xl font-black text-pink-400 mb-4">Ms Mèo</h3>
                    </div>
                    
                    {earnedGoldMedal ? (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
                        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-3xl p-5 border-2 border-amber-300 min-w-[160px] shadow-sm">
                          <div className="text-amber-800 font-black text-4xl mb-0.5">{score}/{questions.length}</div>
                          <div className="text-amber-700 font-black text-[10px] uppercase tracking-wider">ĐIỂM TUYỆT ĐỐI (100%)</div>
                        </div>
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-5 border-2 border-orange-200 min-w-[160px] shadow-sm">
                          <div className="text-orange-700 font-black text-4xl mb-0.5">
                            {goldMedalStats?.timeUsed || (totalTimeLimit - timeRemaining)}s
                          </div>
                          <div className="text-orange-800 font-black text-[10px] uppercase tracking-wider">THỜI GIAN HOÀN THÀNH</div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-pink-50 rounded-3xl p-6 mb-6 border-2 border-pink-100 inline-block min-w-[200px]">
                        <div className="text-pink-500 font-black text-5xl mb-1">{score}/{questions.length}</div>
                        <div className="text-pink-400 font-bold text-xs uppercase tracking-widest">ĐIỂM SỐ ĐẠT ĐƯỢC</div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-end mt-8">
                      <div className="text-left">
                        <div className="w-28 h-px bg-zinc-200 mb-2" />
                        <p className="text-[9px] font-bold text-zinc-400 uppercase">Ngày cấp</p>
                        <p className="text-xs font-bold text-zinc-600">{new Date().toLocaleDateString('vi-VN')}</p>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex justify-end mb-1">
                          <img 
                            src="https://upload.wikimedia.org/wikipedia/en/0/05/Hello_kitty_character_portrait.png" 
                            alt="Signature" 
                            className="w-10 h-10 object-contain opacity-50"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="w-28 h-px bg-zinc-200 mb-2" />
                        <p className="text-[9px] font-bold text-zinc-400 uppercase">Chữ ký</p>
                        <p className="text-sm font-black text-pink-400 italic">Ms Mèo</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-center gap-3">
                  <button 
                    onClick={() => setGameState(currentQuestionIdx === questions.length - 1 && userAnswers.length === questions.length ? 'FINISHED' : 'PLAYING')} 
                    className="bg-white text-pink-400 px-6 py-2.5 rounded-2xl font-bold text-sm shadow-xs border-2 border-pink-100 flex items-center gap-2"
                  >
                    Quay lại <ChevronRight size={16} />
                  </button>
                  <button 
                    onClick={handleShare} 
                    className="bg-pink-400 text-white px-6 py-2.5 rounded-2xl font-bold text-sm shadow-md shadow-pink-100 flex items-center gap-2"
                  >
                    Chia sẻ <Share2 size={16} />
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </section>
      </main>

      {/* FINGER GESTURE GUIDANCE MODAL */}
      <AnimatePresence>
        {showFingerGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full shadow-2xl border-4 border-amber-100 relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-6 pb-3 border-b border-amber-100">
                <div className="flex items-center gap-2.5">
                  <div className="bg-amber-100 p-2.5 rounded-2xl text-amber-600">
                    <Hand size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-zinc-800">Hướng Dẫn Cử Chỉ Ngón Tay 🖐️</h3>
                    <p className="text-xs text-amber-700 font-bold">Quy tắc chọn đáp án 4 phương án cực dễ</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowFingerGuideModal(false)}
                  className="p-2 text-zinc-400 hover:text-pink-500 rounded-full hover:bg-pink-50 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3.5 mb-6">
                {[
                  { finger: '☝️ 1 Ngón', desc: 'Giơ ngón trỏ lên trước camera', opt: 'Chọn Đáp án A', color: 'bg-blue-50 border-blue-200 text-blue-800' },
                  { finger: '✌️ 2 Ngón', desc: 'Giơ 2 ngón (ngón trỏ + ngón giữa - chữ V)', opt: 'Chọn Đáp án B', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
                  { finger: '🤟 3 Ngón', desc: 'Giơ 3 ngón tay lên', opt: 'Chọn Đáp án C', color: 'bg-purple-50 border-purple-200 text-purple-800' },
                  { finger: '🖖 4 Ngón', desc: 'Giơ 4 ngón tay lên (hoặc bàn tay)', opt: 'Chọn Đáp án D', color: 'bg-pink-50 border-pink-200 text-pink-800' },
                ].map((item, i) => (
                  <div key={i} className={`p-4 rounded-2xl border-2 flex items-center justify-between ${item.color}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.finger.split(' ')[0]}</span>
                      <div>
                        <div className="font-black text-sm">{item.finger}</div>
                        <div className="text-[11px] opacity-80">{item.desc}</div>
                      </div>
                    </div>
                    <div className="font-black text-xs px-3 py-1.5 bg-white rounded-xl shadow-xs shrink-0 border border-current">
                      ➔ {item.opt}
                    </div>
                  </div>
                ))}
              </div>

              {/* Automatic hold-to-confirm info */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 mb-6">
                <div className="font-black text-amber-800 text-xs flex items-center gap-1.5">
                  <Sparkles size={16} /> Cơ chế chốt đáp án thông minh:
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  1. <strong>Tự động chốt:</strong> Khi bạn giơ đúng số ngón tay và giữ yên trong <strong>1.3 giây</strong>, vạch màu sẽ chạy đầy và hệ thống tự động xác nhận đáp án.<br/>
                  2. <strong>Bấm trực tiếp:</strong> Bạn cũng có thể bấm chuột hoặc chạm màn hình vào thẻ đáp án hoặc nút "Xác nhận đáp án" bất kỳ lúc nào.<br/>
                  3. <strong>Bộ 2 đáp án:</strong> Vẫn hỗ trợ nghiêng đầu sang Phải (A) hoặc sang Trái (B) quen thuộc!
                </p>
              </div>

              <button
                onClick={() => setShowFingerGuideModal(false)}
                className="w-full bg-pink-400 hover:bg-pink-500 text-white font-bold py-3.5 rounded-2xl text-sm shadow-md cute-button"
              >
                Đã hiểu, sẵn sàng chơi ngay! 🎯
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SETTINGS MODAL */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full shadow-2xl border-4 border-pink-100 relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-6 pb-3 border-b border-pink-100">
                <div className="flex items-center gap-2.5">
                  <div className="bg-pink-100 p-2 rounded-xl text-pink-500">
                    <Settings size={22} />
                  </div>
                  <h3 className="text-xl font-black text-zinc-800">Cài đặt Ms Mèo</h3>
                </div>
                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="p-2 text-zinc-400 hover:text-pink-500 rounded-full hover:bg-pink-50 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1.5 p-1 bg-pink-50/70 rounded-2xl mb-6">
                <button 
                  onClick={() => setSettingsTab('camera')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    settingsTab === 'camera' ? 'bg-white text-pink-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <Camera size={13} /> Camera
                </button>
                <button 
                  onClick={() => setSettingsTab('audio')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    settingsTab === 'audio' ? 'bg-white text-pink-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <Volume2 size={13} /> Âm thanh
                </button>
                <button 
                  onClick={() => setSettingsTab('visual')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    settingsTab === 'visual' ? 'bg-white text-pink-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <Sparkles size={13} /> Hiệu ứng
                </button>
                <button 
                  onClick={() => setSettingsTab('timed')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    settingsTab === 'timed' ? 'bg-white text-amber-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <Timer size={13} /> Thử thách
                </button>
              </div>

              {/* CAMERA TAB */}
              {settingsTab === 'camera' && (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-zinc-600 block mb-1.5">
                      Chọn thiết bị Camera:
                    </label>
                    <select
                      value={settings.cameraDeviceId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setSettings(prev => ({ ...prev, cameraDeviceId: newId }));
                        if (isCameraReady) {
                          startCamera(newId);
                        }
                      }}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-pink-300"
                    >
                      {availableCameras.length === 0 ? (
                        <option value="">Camera mặc định hệ thống</option>
                      ) : (
                        availableCameras.map((device, idx) => (
                          <option key={device.deviceId || idx} value={device.deviceId}>
                            {device.label || `Camera ${idx + 1}`}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <div>
                      <div className="text-xs font-bold text-zinc-800">Lật gương hình ảnh (Mirror)</div>
                      <div className="text-[11px] text-zinc-400">Hình ảnh tự nhiên như soi gương</div>
                    </div>
                    <input 
                      type="checkbox"
                      checked={settings.mirrorCamera}
                      onChange={(e) => setSettings(prev => ({ ...prev, mirrorCamera: e.target.checked }))}
                      className="w-5 h-5 accent-pink-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-600 block mb-1.5">
                      Độ nhạy nhận diện cử chỉ:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['low', 'medium', 'high'] as const).map(level => (
                        <button
                          key={level}
                          onClick={() => setSettings(prev => ({ ...prev, sensitivity: level }))}
                          className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                            settings.sensitivity === level 
                              ? 'bg-pink-400 text-white border-pink-400 shadow-xs' 
                              : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                          }`}
                        >
                          {level === 'low' ? 'Chậm/Cẩn thận' : level === 'medium' ? 'Chuẩn vừa' : 'Nhạy/Nhanh'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <div>
                      <div className="text-xs font-bold text-zinc-800">Hiện hướng dẫn cử chỉ trên màn hình</div>
                      <div className="text-[11px] text-zinc-400">Hiện gợi ý ngón tay và quay đầu</div>
                    </div>
                    <input 
                      type="checkbox"
                      checked={settings.showGestureHints}
                      onChange={(e) => setSettings(prev => ({ ...prev, showGestureHints: e.target.checked }))}
                      className="w-5 h-5 accent-pink-400 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* AUDIO TAB */}
              {settingsTab === 'audio' && (
                <div className="space-y-5">
                  {/* Background Music */}
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Music size={18} className="text-pink-400" />
                        <span className="text-xs font-bold text-zinc-800">Nhạc nền trò chơi</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={settings.musicEnabled}
                        onChange={(e) => setSettings(prev => ({ ...prev, musicEnabled: e.target.checked }))}
                        className="w-5 h-5 accent-pink-400 cursor-pointer"
                      />
                    </div>
                    {settings.musicEnabled && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-zinc-500 font-bold">
                          <span>Âm lượng nhạc nền</span>
                          <span>{settings.musicVolume}%</span>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          value={settings.musicVolume}
                          onChange={(e) => setSettings(prev => ({ ...prev, musicVolume: Number(e.target.value) }))}
                          className="w-full accent-pink-400 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* Sound Effects */}
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Volume2 size={18} className="text-pink-400" />
                        <span className="text-xs font-bold text-zinc-800">Hiệu ứng âm thanh Đúng / Sai</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={settings.sfxEnabled}
                        onChange={(e) => setSettings(prev => ({ ...prev, sfxEnabled: e.target.checked }))}
                        className="w-5 h-5 accent-pink-400 cursor-pointer"
                      />
                    </div>
                    {settings.sfxEnabled && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-zinc-500 font-bold">
                            <span>Âm lượng hiệu ứng</span>
                            <span>{settings.sfxVolume}%</span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            value={settings.sfxVolume}
                            onChange={(e) => setSettings(prev => ({ ...prev, sfxVolume: Number(e.target.value) }))}
                            className="w-full accent-pink-400 cursor-pointer"
                          />
                        </div>

                        {/* Test sounds */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => playSfx('correct')}
                            className="py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors flex items-center justify-center gap-1"
                          >
                            🎵 Nghe thử nhạc vui
                          </button>
                          <button
                            type="button"
                            onClick={() => playSfx('incorrect')}
                            className="py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors flex items-center justify-center gap-1"
                          >
                            🎶 Nghe thử nhạc buồn
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VISUAL TAB */}
              {settingsTab === 'visual' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <div>
                      <div className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-yellow-500" />
                        Hiệu ứng pháo hoa khi trả lời đúng
                      </div>
                      <div className="text-[11px] text-zinc-400">Bắn pháo hoa rực rỡ ăn mừng đáp án đúng</div>
                    </div>
                    <input 
                      type="checkbox"
                      checked={settings.enableFireworks}
                      onChange={(e) => setSettings(prev => ({ ...prev, enableFireworks: e.target.checked }))}
                      className="w-5 h-5 accent-pink-400 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <div>
                      <div className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                        <Heart size={14} className="text-pink-400" />
                        Hiệu ứng tim & sao bay lơ lửng nền
                      </div>
                      <div className="text-[11px] text-zinc-400">Trang trí nền chuyển động dễ thương</div>
                    </div>
                    <input 
                      type="checkbox"
                      checked={settings.floatingElements}
                      onChange={(e) => setSettings(prev => ({ ...prev, floatingElements: e.target.checked }))}
                      className="w-5 h-5 accent-pink-400 cursor-pointer"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => triggerFireworksShow()}
                      className="w-full py-2.5 bg-pink-50 border border-pink-200 text-pink-600 rounded-2xl text-xs font-bold hover:bg-pink-100 transition-colors flex items-center justify-center gap-1.5"
                    >
                      🎆 Bắn thử hiệu ứng pháo hoa
                    </button>
                  </div>
                </div>
              )}

              {/* TIMED CHALLENGE TAB */}
              {settingsTab === 'timed' && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
                    <div className="flex items-center gap-2 text-amber-800 font-black text-sm">
                      <Timer size={18} className="text-amber-600" />
                      <span>Thời gian mỗi câu hỏi trong Thử thách:</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { sec: 10, label: 'Siêu tốc', desc: '10s' },
                        { sec: 15, label: 'Chuẩn', desc: '15s' },
                        { sec: 20, label: 'Dễ thở', desc: '20s' },
                        { sec: 30, label: 'Thoải mái', desc: '30s' }
                      ].map(item => (
                        <button
                          key={item.sec}
                          type="button"
                          onClick={() => {
                            setSettings(prev => ({ ...prev, timePerQuestion: item.sec }));
                            setTimedModePace(item.sec);
                          }}
                          className={`p-2.5 rounded-xl text-center border transition-all ${
                            (settings.timePerQuestion || 15) === item.sec
                              ? 'bg-amber-400 text-white border-amber-500 font-black shadow-xs'
                              : 'bg-white text-zinc-600 border-zinc-200 hover:border-amber-200 font-bold'
                          }`}
                        >
                          <div className="text-xs">{item.label}</div>
                          <div className="text-[10px] opacity-80">{item.desc} / câu</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-amber-700 font-medium">
                      💡 Với bộ đề 4 câu, tổng thời gian sẽ là <strong>{(settings.timePerQuestion || 15) * 4} giây</strong>.
                    </p>
                  </div>

                  {/* Medals Showcase card in Settings */}
                  <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl border border-yellow-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-yellow-400 p-2.5 rounded-2xl text-amber-950 shadow-xs">
                        <Award size={24} />
                      </div>
                      <div>
                        <div className="text-xs font-black text-amber-900">Huy chương Vàng đã đạt:</div>
                        <div className="text-xl font-black text-amber-600">{goldMedalsCount} 🥇</div>
                      </div>
                    </div>
                    {goldMedalsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Bạn có chắc chắn muốn đặt lại số lượng Huy chương Vàng về 0 không?")) {
                            setGoldMedalsCount(0);
                          }
                        }}
                        className="text-[10px] text-zinc-400 hover:text-red-500 font-bold underline px-2 py-1"
                      >
                        Đặt lại
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-3 border-t border-pink-100">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="w-full bg-pink-400 hover:bg-pink-500 text-white font-bold py-3 rounded-2xl text-sm shadow-md shadow-pink-100 cute-button"
                >
                  Xong & Đóng cài đặt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI QUESTION GENERATION MODAL (Includes Topic Prompt, Copy-Paste Raw Text, 4 Options, and In-preview Editing) */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-2xl w-full shadow-2xl border-4 border-purple-100 relative max-h-[92vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-purple-100">
                <div className="flex items-center gap-2.5">
                  <div className="bg-gradient-to-br from-pink-400 to-purple-500 p-2.5 rounded-xl text-white shadow-sm">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-zinc-800">Tạo Câu Hỏi Cùng AI Ms Mèo 🐾</h3>
                    <p className="text-xs text-purple-600 font-semibold">Tự động sinh hoặc phân tích văn bản ngoài thành trắc nghiệm 4 đáp án</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (!aiGenerating) {
                      setShowAiModal(false);
                      setAiGeneratedSet(null);
                    }
                  }}
                  className="p-2 text-zinc-400 hover:text-pink-500 rounded-full hover:bg-pink-50 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {!aiGeneratedSet ? (
                <div className="space-y-4">
                  {/* Mode switcher: Templates (0s) vs Topic vs Paste Raw Text */}
                  <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-purple-50 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setAiInputMode('templates')}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        aiInputMode === 'templates' 
                          ? 'bg-white text-purple-700 shadow-sm' 
                          : 'text-zinc-500 hover:text-purple-600'
                      }`}
                    >
                      <Zap size={14} className="text-amber-500 fill-amber-500" />
                      <span className="truncate">Kho mẫu (0 giây)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiInputMode('topic')}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        aiInputMode === 'topic' 
                          ? 'bg-white text-purple-700 shadow-sm' 
                          : 'text-zinc-500 hover:text-purple-600'
                      }`}
                    >
                      <Sparkles size={14} className="text-purple-500" />
                      <span className="truncate">Tạo theo chủ đề</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiInputMode('paste')}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        aiInputMode === 'paste' 
                          ? 'bg-white text-purple-700 shadow-sm' 
                          : 'text-zinc-500 hover:text-purple-600'
                      }`}
                    >
                      <ClipboardPaste size={14} className="text-pink-500" />
                      <span className="truncate">Dán văn bản</span>
                    </button>
                  </div>

                  {/* Options count selector (4 or 2) */}
                  <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-700">
                      Định dạng số đáp án:
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAiOptionsCount(4)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border ${
                          aiOptionsCount === 4
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        <span>🖐️ 4 Đáp án (A-D)</span>
                        <span className="text-[10px] bg-white/20 px-1 py-0.2 rounded">Khuyên dùng</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiOptionsCount(2)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 border ${
                          aiOptionsCount === 2
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        <span>✌️ 2 Đáp án (A-B)</span>
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: INSTANT TEMPLATES (0 SECONDS - CHƠI NGAY LẬP TỨC) */}
                  {aiInputMode === 'templates' && (
                    <div className="space-y-3">
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 font-medium">
                        <Zap size={20} className="text-amber-500 fill-amber-500 shrink-0" />
                        <div>
                          <p className="font-bold">Tạo câu hỏi nhanh nhất: 0 giây không cần chờ!</p>
                          <p className="text-[11px] text-amber-700">Chọn bộ câu hỏi có sẵn được biên tập chuẩn xác, bạn có thể chỉnh sửa tự do và bắt đầu chơi ngay lập tức.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                        {INSTANT_TEMPLATES.map((tpl) => (
                          <div 
                            key={tpl.id}
                            className="bg-white border-2 border-purple-100 hover:border-purple-300 rounded-2xl p-3.5 flex flex-col justify-between transition-all hover:shadow-md group"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-2xl">{tpl.icon}</span>
                                <span className="text-[10px] font-black bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                  {tpl.badge}
                                </span>
                              </div>
                              <h4 className="font-black text-sm text-zinc-800 group-hover:text-purple-700 transition-colors">
                                {tpl.title}
                              </h4>
                              <p className="text-[11px] text-zinc-500 font-medium line-clamp-2 mt-1">
                                {tpl.description}
                              </p>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-purple-50 flex items-center justify-between">
                              <span className="text-[11px] font-bold text-zinc-400">
                                {tpl.questions.length} câu • Chuẩn 4 đáp án
                              </span>
                              <button
                                type="button"
                                onClick={() => handleSelectInstantTemplate(tpl)}
                                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1 active:scale-95 transition-all"
                              >
                                <Zap size={12} className="fill-white" /> Chọn ngay (0s)
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: TOPIC INPUT WITH 1-CLICK GENERATE */}
                  {aiInputMode === 'topic' && (
                    <div className="space-y-4">
                      {/* Speed Tip Banner */}
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 p-2.5 rounded-2xl flex items-center justify-between text-xs text-purple-900 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Zap size={16} className="text-amber-500 fill-amber-500 shrink-0" />
                          <span>Mẹo nhanh: Chọn <b>3 câu</b> để Ms Mèo sinh câu hỏi chỉ trong ~2 giây!</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleGenerateQuestionsWithAi("Toán vui tính nhanh", 3)}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-black px-2.5 py-1 rounded-xl shrink-0 shadow-xs flex items-center gap-1"
                        >
                          <Zap size={12} /> Thử ngay 3 câu
                        </button>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-700 block mb-1.5">
                          Chủ đề câu hỏi bạn muốn tạo: <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <input 
                            type="text"
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                            placeholder="Ví dụ: Động vật đáng yêu, Toán vui, Địa lý Việt Nam, Tiếng Anh..."
                            className="w-full bg-zinc-50 border-2 border-purple-50 focus:border-purple-300 rounded-2xl px-4 py-3 text-sm font-semibold outline-none transition-colors pr-10"
                            disabled={aiGenerating}
                          />
                          {aiTopic && (
                            <button
                              type="button"
                              onClick={() => setAiTopic('')}
                              className="absolute right-3 top-3.5 text-zinc-400 hover:text-zinc-600"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quick 1-Tap Topic Chips */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            ⚡ Chủ đề tạo nhanh 1-chạm:
                          </span>
                          <span className="text-[10px] text-purple-600 font-bold">
                            Bấm "⚡ Tạo" để sinh ngay
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { name: "Thế giới động vật", icon: "🐶🐱" },
                            { name: "Toán vui tính nhẩm", icon: "🔢" },
                            { name: "Từ vựng Tiếng Anh", icon: "🇬🇧" },
                            { name: "Câu đố mẹo trí tuệ", icon: "💡" },
                            { name: "Địa lý Việt Nam", icon: "🇻🇳" },
                            { name: "Khoa học quanh em", icon: "🔬" }
                          ].map(item => (
                            <div 
                              key={item.name}
                              className="flex items-center bg-purple-50 hover:bg-purple-100 rounded-full border border-purple-200 pl-3 pr-1 py-1 transition-all"
                            >
                              <button
                                type="button"
                                onClick={() => setAiTopic(item.name)}
                                className="text-xs font-bold text-purple-800 mr-2 hover:underline"
                              >
                                {item.icon} {item.name}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGenerateQuestionsWithAi(item.name, 3)}
                                className="bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-xs transition-all"
                                title={`Tạo siêu tốc 3 câu về ${item.name}`}
                              >
                                <Zap size={10} className="fill-white" /> Tạo
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Options row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div>
                          <label className="text-xs font-bold text-zinc-600 block mb-1">Số câu hỏi:</label>
                          <select
                            value={aiCount}
                            onChange={(e) => setAiCount(Number(e.target.value))}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs font-bold outline-none"
                            disabled={aiGenerating}
                          >
                            <option value={3}>⚡ 3 câu (Siêu tốc ~2s)</option>
                            <option value={5}>5 câu (Khuyên dùng)</option>
                            <option value={8}>8 câu</option>
                            <option value={10}>10 câu</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-zinc-600 block mb-1">Đối tượng:</label>
                          <select
                            value={aiGrade}
                            onChange={(e) => setAiGrade(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs font-bold outline-none"
                            disabled={aiGenerating}
                          >
                            <option value="Mầm non">Mầm non (3 - 5 tuổi)</option>
                            <option value="Tiểu học (Lớp 1-5)">Tiểu học (Lớp 1-5)</option>
                            <option value="THCS (Lớp 6-9)">THCS (Lớp 6-9)</option>
                            <option value="Mọi lứa tuổi">Mọi lứa tuổi</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-zinc-600 block mb-1">Độ khó:</label>
                          <select
                            value={aiDifficulty}
                            onChange={(e) => setAiDifficulty(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs font-bold outline-none"
                            disabled={aiGenerating}
                          >
                            <option value="Dễ và vui">Dễ & Vui tươi</option>
                            <option value="Vừa phải">Vừa phải</option>
                            <option value="Thử thách">Thử thách trí tuệ</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: COPY-PASTE RAW TEXT (WITH INSTANT 0S PARSER) */}
                  {aiInputMode === 'paste' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-zinc-700">
                          Dán văn bản câu hỏi hoặc đề thi vào đây: <span className="text-red-400">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setAiPastedText(`Câu 1: Kim loại nào sau đây dẫn điện tốt nhất?
A. Đồng
B. Bạc
C. Vàng
D. Nhôm
Đáp án: B

Câu 2: Việt Nam có bao nhiêu tỉnh thành phố trực thuộc Trung ương?
A. 61
B. 62
C. 63
D. 64
Đáp án: C

Câu 3: Đỉnh núi Fansipan được mệnh danh là gì?
A. Nóc nhà Đông Dương
B. Đỉnh núi cao nhất châu Á
C. Đệ nhất hùng sơn
D. Núi lửa Tây Bắc
Đáp án: A`);
                          }}
                          className="text-[11px] text-purple-600 hover:underline font-bold"
                        >
                          📋 Chèn văn bản đề thi mẫu
                        </button>
                      </div>

                      {/* Live Detection Notification */}
                      {(() => {
                        const parsed = parseQuizTextInstantly(aiPastedText, aiOptionsCount);
                        if (parsed && parsed.questions.length > 0) {
                          return (
                            <div className="bg-emerald-50 border-2 border-emerald-300 p-3 rounded-2xl flex items-center justify-between shadow-xs">
                              <div className="flex items-center gap-2">
                                <Zap className="text-emerald-600 fill-emerald-600" size={18} />
                                <div>
                                  <p className="text-xs font-black text-emerald-800">
                                    Đã phát hiện {parsed.questions.length} câu hỏi trắc nghiệm hợp lệ!
                                  </p>
                                  <p className="text-[11px] text-emerald-600">
                                    Có thể chuyển thành câu hỏi ngay lập tức trong 0 giây không cần chờ AI.
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={handleInstantParsePastedText}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all shrink-0"
                              >
                                <Zap size={14} className="fill-white" /> Tạo ngay (0s)
                              </button>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <textarea
                        value={aiPastedText}
                        onChange={(e) => setAiPastedText(e.target.value)}
                        placeholder={`Dán nội dung câu hỏi, đề thi từ Word, Website hoặc tài liệu vào đây...
Ví dụ:
Câu 1: Thủ đô của nước ta là gì?
A. Hà Nội
B. TP. Hồ Chí Minh
C. Đà Nẵng
D. Cần Thơ
Đáp án: A`}
                        rows={6}
                        className="w-full bg-zinc-50 border-2 border-purple-50 focus:border-purple-300 rounded-2xl p-4 text-xs font-medium outline-none transition-colors custom-scrollbar"
                        disabled={aiGenerating}
                      />
                      
                      <div className="flex justify-between items-center text-[11px] text-zinc-400">
                        <span>Hỗ trợ định dạng: Câu 1 / 1., A/B/C/D, Đáp án: A.</span>
                        {aiPastedText && (
                          <button
                            type="button"
                            onClick={() => setAiPastedText('')}
                            className="text-red-400 hover:underline"
                          >
                            Xóa trắng
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {aiError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs font-bold">
                      {aiError}
                    </div>
                  )}

                  {aiGenerating ? (
                    <div className="py-8 flex flex-col items-center justify-center text-center">
                      <motion.div 
                        animate={{ rotate: 360, scale: [1, 1.15, 1] }} 
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="p-4 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-full mb-3 shadow-lg shadow-purple-200"
                      >
                        <Sparkles size={30} />
                      </motion.div>
                      <div className="flex items-center gap-2 text-purple-700 font-black text-base">
                        <Timer size={18} className="animate-spin text-purple-600" />
                        <span>Đang tạo siêu tốc: {aiGenSeconds}s 🚀</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        Ms Mèo AI đang biên tập {aiCount} câu hỏi chuẩn {aiOptionsCount} đáp án...
                      </p>
                    </div>
                  ) : (
                    <div className="pt-2">
                      {aiInputMode === 'paste' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={handleInstantParsePastedText}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-4 rounded-2xl text-sm shadow-md cute-button flex items-center justify-center gap-2"
                          >
                            <Zap size={18} className="fill-white" />
                            <span>Tạo siêu tốc (0 giây)</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleParsePastedTextWithAi}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-black py-3.5 px-4 rounded-2xl text-sm shadow-md cute-button flex items-center justify-center gap-2"
                          >
                            <Wand2 size={18} />
                            <span>Phân tích với AI</span>
                          </button>
                        </div>
                      ) : aiInputMode === 'topic' ? (
                        <button
                          type="button"
                          onClick={() => handleGenerateQuestionsWithAi()}
                          className="w-full bg-gradient-to-r from-purple-500 via-pink-400 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-black py-4 rounded-2xl text-base shadow-lg shadow-purple-200 cute-button flex items-center justify-center gap-2.5"
                        >
                          <Zap size={20} className="fill-white" />
                          <span>Ms Mèo tạo bộ câu hỏi ngay ✨</span>
                        </button>
                      ) : (
                        <div className="text-center text-xs text-zinc-400 py-1">
                          👆 Chọn một bộ câu hỏi mẫu ở trên để mở ngay lập tức trong 0 giây!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* PREVIEW OF AI GENERATED QUESTIONS (WITH MANUAL EDITING DIRECTLY IN PREVIEW) */
                <div className="space-y-4">
                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 text-purple-700 font-black text-xs">
                        <Sparkles size={16} /> Bộ câu hỏi đã sẵn sàng để kiểm tra & chỉnh sửa:
                      </div>
                      <span className="text-[11px] font-bold text-purple-600 bg-white px-2 py-0.5 rounded-full border border-purple-100">
                        {aiGeneratedSet.questions.length} câu • {aiGeneratedSet.questions[0]?.options.length || 4} đáp án
                      </span>
                    </div>

                    {/* Editable Title */}
                    <input 
                      type="text"
                      value={aiGeneratedSet.title}
                      onChange={(e) => setAiGeneratedSet({ ...aiGeneratedSet, title: e.target.value })}
                      className="text-lg font-black text-zinc-800 bg-transparent w-full border-b border-purple-200 focus:border-purple-500 outline-none pb-0.5 mb-1"
                      placeholder="Nhập tên bộ câu hỏi..."
                    />
                    <input 
                      type="text"
                      value={aiGeneratedSet.description || ''}
                      onChange={(e) => setAiGeneratedSet({ ...aiGeneratedSet, description: e.target.value })}
                      className="text-xs text-zinc-500 bg-transparent w-full outline-none font-medium"
                      placeholder="Nhập mô tả bộ câu hỏi..."
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold text-zinc-600 px-1">
                    <span>✏️ Bạn có thể chỉnh sửa trực tiếp từng câu hỏi bên dưới:</span>
                    <button
                      type="button"
                      onClick={handleAddAiPreviewQuestion}
                      className="text-purple-600 hover:text-purple-800 flex items-center gap-1 font-bold text-xs"
                    >
                      <Plus size={14} /> Thêm câu hỏi
                    </button>
                  </div>

                  {/* List of generated questions with manual inline editing */}
                  <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                    {aiGeneratedSet.questions.map((q, qIdx) => (
                      <div key={q.id || qIdx} className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs relative group">
                        
                        {/* Header of Question Card: Index, Question Input, Delete */}
                        <div className="flex items-start gap-2 mb-2.5">
                          <span className="bg-purple-200 text-purple-800 font-black px-2 py-1 rounded-lg text-xs shrink-0 mt-0.5">
                            Câu {qIdx + 1}
                          </span>
                          <div className="flex-1">
                            <input
                              type="text"
                              value={q.question}
                              onChange={(e) => handleUpdateAiPreviewQuestion(qIdx, 'question', e.target.value)}
                              className="w-full bg-white font-bold text-zinc-800 p-2 rounded-xl border border-zinc-200 focus:border-purple-400 outline-none text-xs"
                              placeholder="Nhập nội dung câu hỏi..."
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteAiPreviewQuestion(qIdx)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                            title="Xóa câu hỏi này"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Options A, B, C, D with Radio for Correct Index and Input for text */}
                        <div className={`grid gap-2 ${q.options.length === 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                          {q.options.map((opt, oIdx) => (
                            <div 
                              key={oIdx}
                              className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
                                oIdx === q.correctIndex 
                                  ? 'bg-emerald-50/80 border-emerald-300' 
                                  : 'bg-white border-zinc-200'
                              }`}
                            >
                              <input 
                                type="radio"
                                name={`ai-preview-correct-${q.id || qIdx}`}
                                checked={oIdx === q.correctIndex}
                                onChange={() => handleUpdateAiPreviewQuestion(qIdx, 'correctIndex', oIdx)}
                                className="accent-emerald-500 w-4 h-4 cursor-pointer shrink-0"
                                title="Đánh dấu đây là đáp án đúng"
                              />
                              <span className="font-black text-xs text-purple-600 shrink-0">
                                {FINGER_ICONS[oIdx]} {OPTION_LETTERS[oIdx]}:
                              </span>
                              <input 
                                type="text"
                                value={opt}
                                onChange={(e) => handleUpdateAiPreviewOption(qIdx, oIdx, e.target.value)}
                                className="w-full bg-transparent text-xs font-semibold text-zinc-700 outline-none"
                                placeholder={`Đáp án ${OPTION_LETTERS[oIdx]}...`}
                              />
                              {oIdx === q.correctIndex && (
                                <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-black shrink-0">
                                  Đúng
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Explanation input */}
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[11px] text-amber-600 font-bold shrink-0">💡 Giải thích:</span>
                          <input 
                            type="text"
                            value={q.explanation || ''}
                            onChange={(e) => handleUpdateAiPreviewQuestion(qIdx, 'explanation', e.target.value)}
                            placeholder="Thêm lời giải thích hoặc mẹo ghi nhớ cho học sinh..."
                            className="w-full bg-white text-[11px] font-medium text-zinc-600 px-2 py-1 rounded-lg border border-zinc-200 outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions for generated set */}
                  <div className="space-y-2 pt-2 border-t border-purple-100">
                    <button
                      type="button"
                      onClick={handlePlayAiSetImmediately}
                      className="w-full bg-pink-400 hover:bg-pink-500 text-white font-bold py-3.5 rounded-2xl text-sm shadow-md shadow-pink-200 cute-button flex items-center justify-center gap-2"
                    >
                      <Gamepad2 size={18} /> Chơi ngay bằng Camera 🎮
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handlePracticeAiSetImmediately}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cute-button flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <GraduationCap size={16} /> Luyện tập ngay 📖
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAiSetToLibrary}
                        className="bg-white hover:bg-zinc-50 border-2 border-purple-200 text-purple-700 font-bold py-2.5 rounded-xl text-xs cute-button flex items-center justify-center gap-1.5"
                      >
                        <Save size={16} /> Lưu vào thư viện 💾
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAiGeneratedSet(null)}
                      className="w-full text-center text-xs text-zinc-400 hover:text-purple-600 font-bold py-1 transition-colors"
                    >
                      ← Đổi chủ đề khác hoặc dán lại
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TIMED CHALLENGE CONFIGURATION MODAL */}
      <AnimatePresence>
        {showTimedConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full shadow-2xl border-4 border-amber-200 relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-tr from-amber-400 to-orange-400 p-2.5 rounded-2xl text-white shadow-md shadow-amber-100">
                    <Timer size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xl font-black text-zinc-800">Thử Thách Thời Gian ⚡</h3>
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Săn Vàng 🥇</span>
                    </div>
                    <p className="text-xs text-amber-700 font-bold">Cạnh tranh với đồng hồ để nhận Huy chương Vàng</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTimedConfigModal(false)}
                  className="p-2 text-zinc-400 hover:text-amber-500 rounded-full hover:bg-amber-50 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Set Selection */}
              <div className="space-y-4 mb-5">
                <div>
                  <label className="text-xs font-bold text-zinc-600 block mb-1.5">
                    Bộ câu hỏi thử thách:
                  </label>
                  <select
                    value={activeSetId}
                    onChange={(e) => setActiveSetId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-amber-400"
                  >
                    {questionSets.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.title} ({s.questions.length} câu)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pace Selection */}
                <div>
                  <label className="text-xs font-bold text-zinc-600 block mb-1.5">
                    Mức độ tốc độ (Thời gian cho mỗi câu):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { sec: 10, label: 'Siêu tốc ⚡', desc: '10s / câu' },
                      { sec: 15, label: 'Chuẩn ⏱️', desc: '15s / câu' },
                      { sec: 20, label: 'Dễ thở 🎯', desc: '20s / câu' },
                      { sec: 30, label: 'Thoải mái 🐢', desc: '30s / câu' }
                    ].map(item => (
                      <button
                        key={item.sec}
                        type="button"
                        onClick={() => setTimedModePace(item.sec)}
                        className={`p-3 rounded-2xl text-center border-2 transition-all ${
                          timedModePace === item.sec
                            ? 'bg-amber-400 text-white border-amber-500 font-black shadow-md shadow-amber-200 scale-102'
                            : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-amber-200 font-bold'
                        }`}
                      >
                        <div className="text-xs">{item.label}</div>
                        <div className={`text-[10px] ${timedModePace === item.sec ? 'text-amber-100' : 'text-zinc-400'}`}>
                          {item.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calculated Total Time & Rule Banner */}
                <div className="p-4 bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">Tổng thời gian làm bài:</span>
                    <span className="text-xl font-black font-mono text-amber-600 bg-white px-3 py-1 rounded-xl border border-amber-200 shadow-2xs">
                      {questions.length * timedModePace} giây
                    </span>
                  </div>

                  <div className="pt-2 border-t border-amber-200/60 text-xs text-amber-800 space-y-1">
                    <div className="font-black flex items-center gap-1.5 text-amber-900">
                      <Award size={15} className="text-amber-600" /> Điều kiện nhận Huy chương Vàng 🥇:
                    </div>
                    <ul className="list-disc list-inside text-[11px] leading-relaxed text-amber-800 font-medium space-y-0.5">
                      <li>Trả lời đúng <strong>100%</strong> ({questions.length}/{questions.length} câu).</li>
                      <li>Hoàn thành <strong>trước khi</strong> đồng hồ đếm về 00:00!</li>
                      <li>Sử dụng cử chỉ ngón tay ☝️, ✌️, 🤟, 🖖 trước camera hoặc bấm chọn trực tiếp.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => startTimedChallenge(activeSetId, timedModePace)}
                  className="w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-white font-black py-4 rounded-2xl text-base shadow-lg shadow-amber-200 cute-button flex items-center justify-center gap-2"
                >
                  <Timer size={20} /> Bắt đầu Thử thách ngay! 🚀
                </button>
                <button
                  type="button"
                  onClick={() => setShowTimedConfigModal(false)}
                  className="w-full py-2.5 text-zinc-400 hover:text-zinc-600 font-bold text-xs"
                >
                  Để sau
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GOLD MEDALS CABINET MODAL */}
      <AnimatePresence>
        {showMedalsCabinetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl border-4 border-yellow-200 relative text-center max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button 
                onClick={() => setShowMedalsCabinetModal(false)}
                className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-amber-500 rounded-full hover:bg-amber-50 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="relative inline-block mb-4 mt-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                  className="absolute -inset-4 bg-gradient-to-r from-yellow-300/30 to-amber-400/30 rounded-full blur-md"
                />
                <motion.div
                  animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="w-28 h-28 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-200 p-1.5 shadow-xl border-4 border-yellow-200 flex items-center justify-center relative z-10"
                >
                  <div className="w-full h-full rounded-full bg-yellow-50 flex flex-col items-center justify-center text-amber-900 border border-amber-300">
                    <Award size={44} className="text-yellow-600" />
                    <span className="text-[9px] font-black uppercase text-amber-800">Ms Mèo 1st</span>
                  </div>
                </motion.div>
              </div>

              <div className="inline-block bg-yellow-100 text-amber-900 text-[10px] font-black uppercase px-3 py-1 rounded-full mb-2 border border-yellow-300">
                Bộ Sưu Tập Thành Tích
              </div>
              <h3 className="text-2xl font-black text-zinc-800 mb-1">Tủ Huy Chương Vàng 🥇</h3>
              <p className="text-xs text-zinc-500 font-medium mb-6">
                Vinh danh người chơi đạt độ chính xác 100% trong Thử thách thời gian
              </p>

              {/* Counter Display */}
              <div className="p-5 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 rounded-3xl border-2 border-amber-200 mb-6 shadow-sm">
                <div className="text-5xl font-black text-amber-600 mb-1">
                  {goldMedalsCount} 🥇
                </div>
                <div className="text-xs font-black uppercase tracking-wider text-amber-800">
                  Huy chương Vàng đã sưu tập
                </div>
              </div>

              {/* Tiers Guide */}
              <div className="text-left bg-zinc-50 rounded-2xl p-4 border border-zinc-100 text-xs mb-6 space-y-2">
                <div className="font-black text-zinc-700 flex items-center gap-1.5">
                  <Trophy size={14} className="text-amber-500" /> Cấp bậc danh hiệu:
                </div>
                <div className="space-y-1.5 text-[11px] font-bold text-zinc-600">
                  <div className={`p-1.5 rounded-lg flex items-center justify-between ${goldMedalsCount >= 1 ? 'bg-amber-100/60 text-amber-900' : 'opacity-60'}`}>
                    <span>🥉 1 Huy chương: Tập sự phản xạ</span>
                    <span>{goldMedalsCount >= 1 ? '✓ Đã đạt' : 'Chưa'}</span>
                  </div>
                  <div className={`p-1.5 rounded-lg flex items-center justify-between ${goldMedalsCount >= 3 ? 'bg-amber-100/60 text-amber-900' : 'opacity-60'}`}>
                    <span>🥈 3 Huy chương: Tay đua ngón tay</span>
                    <span>{goldMedalsCount >= 3 ? '✓ Đã đạt' : 'Chưa'}</span>
                  </div>
                  <div className={`p-1.5 rounded-lg flex items-center justify-between ${goldMedalsCount >= 5 ? 'bg-amber-100/60 text-amber-900' : 'opacity-60'}`}>
                    <span>🥇 5 Huy chương: Bậc thầy Ms Mèo</span>
                    <span>{goldMedalsCount >= 5 ? '✓ Đã đạt' : 'Chưa'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowMedalsCabinetModal(false);
                    setShowTimedConfigModal(true);
                  }}
                  className="w-full bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold py-3.5 rounded-2xl text-sm shadow-md shadow-amber-200 cute-button flex items-center justify-center gap-2"
                >
                  <Timer size={16} /> Chơi Thử thách để săn thêm ⚡
                </button>
                <button
                  type="button"
                  onClick={() => setShowMedalsCabinetModal(false)}
                  className="w-full py-2 text-zinc-400 hover:text-zinc-600 font-bold text-xs"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

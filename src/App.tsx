import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  FaceLandmarker, 
  HandLandmarker, 
  FilesetResolver,
  FaceLandmarkerResult,
  HandLandmarkerResult
} from '@mediapipe/tasks-vision';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, CheckCircle2, XCircle, ChevronRight, Trophy, RefreshCcw, Hand, Smile, Settings, Plus, Trash2, Save, Heart, Star, Sparkles, Music, Upload, Loader2, Share2, BookOpen, Home } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GoogleGenAI, Type } from "@google/genai";
import mammoth from "mammoth";

// --- TYPES ---
type Question = {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  image?: string;
};

type QuestionSet = {
  id: string;
  title: string;
  questions: Question[];
  createdAt: number;
};

type GameState = 'START' | 'LIBRARY' | 'PLAYING' | 'RESULT' | 'FINISHED' | 'EDITING' | 'CERTIFICATE' | 'DETAILS';

const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 1,
    question: "Con mèo kêu thế nào?",
    options: ["Gâu Gâu", "Meo Meo"],
    correctIndex: 1,
  },
  {
    id: 2,
    question: "Trái đất hình gì?",
    options: ["Hình Tròn", "Hình Vuông"],
    correctIndex: 0,
  }
];

const INITIAL_SET: QuestionSet = {
  id: 'default',
  title: 'Bộ câu hỏi mặc định',
  questions: DEFAULT_QUESTIONS,
  createdAt: Date.now()
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
            delay: Math.random() * 10
          }}
          className="absolute text-soft-pink"
        >
          {i % 2 === 0 ? <Heart size={24 + Math.random() * 24} fill="currentColor" /> : <Star size={20 + Math.random() * 20} fill="currentColor" />}
        </motion.div>
      ))}
    </div>
  );
};

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);

  const [questionSets, setQuestionSets] = useState<QuestionSet[]>(() => {
    const saved = localStorage.getItem('ms_meo_sets');
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
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const lastGestureTime = useRef(0);
  const COOLDOWN = 800;

  const questions = questionSets.find(s => s.id === activeSetId)?.questions || DEFAULT_QUESTIONS;
  const currentQuestion = questions[currentQuestionIdx] || questions[0];

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
      }
    }
    initAI();
  }, []);

  const startCamera = async () => {
    if (videoRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraReady(true);
          setGameState('PLAYING');
        };
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    }
  };

  const detect = useCallback(() => {
    if (!videoRef.current || !faceLandmarkerRef.current || !handLandmarkerRef.current || gameState === 'FINISHED' || gameState === 'EDITING') return;
    const startTimeMs = performance.now();
    if (videoRef.current.readyState >= 2) {
      const faceResult = faceLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
      const handResult = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
      processGestures(faceResult, handResult);
    }
    requestRef.current = requestAnimationFrame(detect);
  }, [gameState]);

  useEffect(() => {
    if (isCameraReady && gameState !== 'EDITING') {
      requestRef.current = requestAnimationFrame(detect);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isCameraReady, detect, gameState]);

  const processGestures = (faceResult: FaceLandmarkerResult, handResult: HandLandmarkerResult) => {
    const now = Date.now();
    if (now - lastGestureTime.current < COOLDOWN) return;

    if (faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0 && gameState === 'PLAYING') {
      const nose = faceResult.faceLandmarks[0][1];
      
      // video is mirrored (scale-x-[-1])
      // User turns head to their RIGHT -> Nose moves to the LEFT in the image (smaller X)
      // User turns head to their LEFT -> Nose moves to the RIGHT in the image (larger X)
      
      if (nose.x < 0.42) { // Turned Right
        setSelectedOption(0); // Option A
        lastGestureTime.current = now;
      } else if (nose.x > 0.58) { // Turned Left
        setSelectedOption(1); // Option B
        lastGestureTime.current = now;
      }
    }

    if (handResult.landmarks && handResult.landmarks.length > 0) {
      const landmarks = handResult.landmarks[0];
      const isIndexRaised = landmarks[8].y < landmarks[6].y;
      const isMiddleRaised = landmarks[12].y < landmarks[10].y;
      const isRingDown = landmarks[16].y > landmarks[14].y;
      
      // 1 Finger (Index only) -> Confirm Answer
      if (isIndexRaised && !isMiddleRaised && isRingDown) {
        if (gameState === 'PLAYING') {
          handleConfirm();
          lastGestureTime.current = now;
        }
      }
      
      // 2 Fingers (Index + Middle) -> Next Question
      if (isIndexRaised && isMiddleRaised && isRingDown) {
        if (gameState === 'RESULT') {
          handleNext();
          lastGestureTime.current = now;
        }
      }
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
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D8B4FE', '#B2F2BB', '#FFF3BF']
      });
      // Play correct sound
      const correctAudio = new Audio('https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3');
      correctAudio.volume = 0.4;
      correctAudio.play().catch(() => {});
    } else {
      // Play incorrect sound
      const errorAudio = new Audio('https://cdn.pixabay.com/audio/2021/08/04/audio_bbdec39215.mp3');
      errorAudio.volume = 0.4;
      errorAudio.play().catch(() => {});
    }
    setGameState('RESULT');
  };

  const handleNext = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOption(0);
      setGameState('PLAYING');
    } else {
      setGameState('FINISHED');
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#D8B4FE', '#B2F2BB', '#FFF3BF']
      });
    }
  };

  const resetGame = () => {
    setCurrentQuestionIdx(0);
    setScore(0);
    setUserAnswers([]);
    setSelectedOption(0);
    setGameState('PLAYING');
  };

  const downloadGameData = () => {
    const dataStr = JSON.stringify(questionSets, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'co_xuan_questions.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleQuestionImageUpload = (qId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingSet) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
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
    const text = `Tôi vừa hoàn thành bài trắc nghiệm trên cô Xuân xinh đẹp và đạt được ${score}/${questions.length} điểm! 🎉✨ Hãy cùng tham gia thử thách với cô Xuân xinh đẹp nhé!`;
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Kết quả cô Xuân xinh đẹp',
          text: text,
          url: url,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        alert('Đã sao chép kết quả vào bộ nhớ tạm! Bạn có thể dán để chia sẻ.');
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
    }
  };

  useEffect(() => {
    localStorage.setItem('ms_meo_sets', JSON.stringify(questionSets));
  }, [questionSets]);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Music play failed:", e));
      }
      setIsMusicPlaying(!isMusicPlaying);
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

  const updateQuestion = (id: number, field: keyof Question, value: any) => {
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingFile(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";
      
      let prompt = "Trích xuất các câu hỏi trắc nghiệm từ tệp này. Mỗi câu hỏi PHẢI có đúng 2 đáp án (A và B). Trong tệp nguồn, đáp án đúng được đánh dấu bằng ký hiệu '#' ở phía trước. Trả về một mảng JSON gồm các đối tượng có 'question' (chuỗi), 'options' (mảng chuỗi gồm 2 phần tử), và 'correctIndex' (số, 0 cho A, 1 cho B). Hãy đảm bảo nội dung bằng tiếng Việt.";
      let contents: any;

      if (file.type === 'text/plain') {
        const text = await file.text();
        contents = { parts: [{ text: `${prompt}\n\nNội dung tệp:\n${text}` }] };
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        contents = { parts: [{ text: `${prompt}\n\nNội dung tệp Word:\n${result.value}` }] };
      } else if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        contents = {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: file.type, data: base64 } }
          ]
        };
      } else {
        alert("Định dạng tệp không được hỗ trợ. Vui lòng tải lên .txt, .docx, .pdf hoặc ảnh.");
        setProcessingFile(false);
        return;
      }

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  minItems: 2,
                  maxItems: 2,
                  description: "Mảng chứa đúng 2 lựa chọn đáp án (A và B)."
                },
                correctIndex: { type: Type.INTEGER, description: "Chỉ số của đáp án đúng (0 hoặc 1)." }
              },
              required: ["question", "options", "correctIndex"]
            }
          }
        }
      });

      const newQuestionsRaw = JSON.parse(response.text);
      const newQuestions: Question[] = newQuestionsRaw.map((q: any, index: number) => ({
        id: Date.now() + index,
        question: q.question,
        options: q.options.slice(0, 2),
        correctIndex: q.correctIndex
      }));

      if (newQuestions.length > 0 && editingSet) {
        setEditingSet({
          ...editingSet,
          questions: newQuestions
        });
      }
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Có lỗi xảy ra khi xử lý tệp. Vui lòng thử lại.");
    } finally {
      setProcessingFile(false);
    }
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
      <p className="text-xl font-bold text-pink-400 tracking-widest animate-pulse">Đang chuẩn bị phép thuật...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-warm-bg text-zinc-700 p-4 md:p-8 overflow-x-hidden relative">
      <FloatingElements />
      
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-8 relative z-10">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          onClick={() => setGameState('START')}
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="bg-soft-pink p-1 rounded-2xl shadow-lg shadow-pink-100 overflow-hidden w-14 h-14 flex items-center justify-center">
            <img 
              src="https://upload.wikimedia.org/wikipedia/en/0/05/Hello_kitty_character_portrait.png" 
              alt="Hello Kitty" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-pink-400 tracking-tight">Ms Mèo</h1>
        </motion.div>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleMusic}
            className={`p-3 rounded-full shadow-sm transition-all ${isMusicPlaying ? 'bg-pink-400 text-white' : 'bg-white text-pink-300 border border-pink-100'}`}
          >
            <Music size={20} className={isMusicPlaying ? 'animate-spin' : ''} />
          </button>
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            onClick={() => {
              if (userAnswers.length > 0) {
                setGameState('CERTIFICATE');
              }
            }}
            className="bg-white px-6 py-2 rounded-full border-2 border-pink-100 shadow-sm flex items-center gap-2 cursor-pointer hover:bg-pink-50 transition-colors"
            title="Xem kết quả và giấy chứng nhận"
          >
            <Heart size={18} className="text-soft-pink" fill="currentColor" />
            <span className="text-lg font-bold text-pink-400">Điểm: {score}/{questions.length}</span>
          </motion.div>
        </div>
        <audio 
          ref={audioRef} 
          src="https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73456.mp3" 
          loop 
          preload="auto"
          crossOrigin="anonymous"
          onError={() => console.warn("Background music failed to load, but the app will continue to work!")}
        />
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-start relative z-10">
        <section className="relative">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="aspect-video bg-white border-8 border-white rounded-[2.5rem] shadow-2xl shadow-pink-100 relative overflow-hidden"
          >
            <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" playsInline muted />
            {!isCameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-pink-50">
                <Camera className="w-12 h-12 text-pink-200 animate-bounce" />
              </div>
            )}
            {gameState === 'PLAYING' && (
              <>
                <div className="absolute top-1/2 left-4 -translate-y-1/2 pointer-events-none">
                  <motion.div 
                    animate={{ x: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border-2 border-pink-200 shadow-lg flex flex-col items-center gap-1"
                  >
                    <span className="text-3xl font-black text-pink-400">A</span>
                    <span className="text-[10px] font-bold text-pink-300 uppercase">Phải</span>
                  </motion.div>
                </div>
                <div className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none">
                  <motion.div 
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border-2 border-pink-200 shadow-lg flex flex-col items-center gap-1"
                  >
                    <span className="text-3xl font-black text-pink-400">B</span>
                    <span className="text-[10px] font-bold text-pink-300 uppercase">Trái</span>
                  </motion.div>
                </div>
                <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center pointer-events-none">
                  <div className="bg-white/90 px-4 py-2 rounded-2xl text-[10px] font-bold uppercase flex items-center gap-2 shadow-sm text-pink-400 backdrop-blur-sm">
                    <Smile className="w-4 h-4" /> Quay phải: A | Quay trái: B
                  </div>
                  <div className="bg-white/90 px-4 py-2 rounded-2xl text-[10px] font-bold uppercase flex items-center gap-2 shadow-sm text-pink-400 backdrop-blur-sm">
                    <Hand className="w-4 h-4" /> 1 ngón: Xác nhận | 2 ngón: Tiếp tục
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </section>

        <section className="min-h-[450px]">
          <AnimatePresence mode="wait">
            {gameState === 'START' && (
              <motion.div 
                key="start" 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                exit={{ y: -20, opacity: 0 }} 
                className="cute-card p-10"
              >
                <div className="flex justify-center mb-6">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
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
                <h2 className="text-3xl font-black text-center text-zinc-800 mb-8">Chào mừng bạn đến với Ms Mèo! ✨</h2>
                <div className="space-y-4">
                  <button onClick={() => setGameState('LIBRARY')} className="w-full bg-pink-400 text-white py-5 rounded-3xl font-bold text-xl shadow-lg shadow-pink-200 cute-button flex items-center justify-center gap-4">Vào thư viện <ChevronRight /></button>
                  <button onClick={downloadGameData} className="w-full bg-white text-pink-400 border-2 border-pink-100 py-4 rounded-3xl font-bold text-lg shadow-sm cute-button flex items-center justify-center gap-3">Tải dữ liệu game <Upload className="rotate-180" size={20} /></button>
                </div>
              </motion.div>
            )}

            {gameState === 'LIBRARY' && (
              <motion.div 
                key="library" 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="cute-card p-8"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-zinc-800">Thư viện câu hỏi 📚</h2>
                  <button onClick={createNewSet} className="bg-soft-mint p-3 rounded-2xl text-green-700 cute-button flex items-center gap-2 font-bold"><Plus size={20} /> Tạo mới</button>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {questionSets.map(set => (
                    <div key={set.id} className="bg-zinc-50 p-5 rounded-3xl border border-zinc-100 flex items-center justify-between group hover:border-pink-200 transition-colors">
                      <div className="flex-1">
                        <h3 className="font-bold text-zinc-800">{set.title}</h3>
                        <p className="text-xs text-zinc-400">{set.questions.length} câu hỏi • {new Date(set.createdAt).toLocaleDateString('vi-VN')}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { setActiveSetId(set.id); resetGame(); startCamera(); }}
                          className="p-3 bg-pink-400 text-white rounded-2xl shadow-sm hover:scale-105 transition-transform"
                        >
                          Chơi
                        </button>
                        <button 
                          onClick={() => { setEditingSet(set); setGameState('EDITING'); }}
                          className="p-3 bg-white text-zinc-600 border border-zinc-200 rounded-2xl hover:bg-zinc-100 transition-colors"
                        >
                          Sửa
                        </button>
                        {set.id !== 'default' && (
                          <button 
                            onClick={() => deleteSet(set.id)}
                            className="p-3 bg-white text-red-400 border border-red-100 rounded-2xl hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setGameState('START')} className="w-full mt-8 py-4 text-zinc-400 font-bold hover:text-pink-400 transition-colors">Quay lại</button>
              </motion.div>
            )}

            {gameState === 'EDITING' && editingSet && (
              <motion.div 
                key="editing" 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="cute-card p-8 max-h-[600px] overflow-y-auto"
              >
                <div className="mb-6">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Tên bộ câu hỏi</label>
                  <input 
                    value={editingSet.title} 
                    onChange={(e) => setEditingSet({...editingSet, title: e.target.value})} 
                    className="w-full bg-zinc-50 rounded-2xl px-6 py-3 border-2 border-transparent focus:border-pink-200 outline-none font-bold text-xl transition-all"
                    placeholder="Nhập tên bộ câu hỏi..."
                  />
                </div>
                <div className="flex justify-between items-center mb-8 sticky top-0 bg-white py-2 z-10">
                  <h2 className="text-2xl font-bold text-zinc-800">Câu hỏi 📝</h2>
                  <div className="flex gap-2">
                    <label className={`bg-soft-pink p-3 rounded-2xl text-white cute-button cursor-pointer ${processingFile ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {processingFile ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                      <input 
                        type="file" 
                        accept=".txt,.docx,.pdf,image/*" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        disabled={processingFile}
                      />
                    </label>
                    <button 
                      onClick={() => { const newQ: Question = { id: Date.now(), question: "Câu hỏi mới?", options: ["A", "B"], correctIndex: 0 }; setEditingSet({...editingSet, questions: [...editingSet.questions, newQ]}); }} 
                      className="bg-soft-mint p-3 rounded-2xl text-green-700 cute-button"
                      disabled={processingFile}
                    >
                      <Plus />
                    </button>
                  </div>
                </div>
                {processingFile && (
                  <div className="mb-6 p-4 bg-pink-50 rounded-2xl flex items-center gap-3 text-pink-500 font-bold animate-pulse">
                    <Loader2 className="animate-spin" />
                    <span>Ms Mèo đang đọc tệp của bạn... ✨</span>
                  </div>
                )}
                <div className="space-y-8">
                  {editingSet.questions.map((q, idx) => (
                    <motion.div 
                      key={q.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-zinc-50 p-6 rounded-3xl relative border border-zinc-100"
                    >
                      <button onClick={() => setEditingSet({...editingSet, questions: editingSet.questions.filter(item => item.id !== q.id)})} className="absolute -top-2 -right-2 bg-white p-2 rounded-full text-red-400 shadow-sm border border-red-50 hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                      <div className="mb-4">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Câu hỏi {idx + 1}</label>
                        <input value={q.question} onChange={(e) => updateQuestion(q.id, 'question', e.target.value)} className="w-full bg-white rounded-xl px-4 py-2 border-2 border-pink-50 focus:border-pink-200 outline-none font-bold transition-colors" />
                      </div>
                      <div className="mb-4">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Hình ảnh câu hỏi (Tùy chọn)</label>
                        <div className="flex items-center gap-4">
                          {q.image ? (
                            <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-pink-100">
                              <img src={q.image} className="w-full h-full object-cover" alt="Question" />
                              <button onClick={() => removeQuestionImage(q.id)} className="absolute top-0 right-0 bg-red-400 text-white p-1 rounded-bl-lg"><Trash2 size={12} /></button>
                            </div>
                          ) : (
                            <label className="w-20 h-20 rounded-xl border-2 border-dashed border-pink-100 flex flex-col items-center justify-center text-pink-300 cursor-pointer hover:bg-pink-50 transition-colors">
                              <Plus size={20} />
                              <span className="text-[8px] font-bold uppercase">Thêm ảnh</span>
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleQuestionImageUpload(q.id, e)} />
                            </label>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-pink-50">
                            <input type="radio" checked={q.correctIndex === oIdx} onChange={() => updateQuestion(q.id, 'correctIndex', oIdx)} className="accent-pink-400 w-4 h-4 cursor-pointer" />
                            <input value={opt} onChange={(e) => updateOption(q.id, oIdx, e.target.value)} className="w-full bg-transparent outline-none text-sm font-medium" />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="flex gap-4 mt-8">
                  <button onClick={() => setGameState('LIBRARY')} className="flex-1 py-4 rounded-3xl font-bold text-zinc-400 hover:bg-zinc-50 transition-colors">Hủy</button>
                  <button onClick={handleSaveQuestions} className="flex-[2] bg-pink-400 text-white py-4 rounded-3xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-pink-100 cute-button"><Save size={20} /> Lưu bộ câu hỏi</button>
                </div>
              </motion.div>
            )}

            {gameState === 'PLAYING' && (
              <motion.div key="playing" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">
                <div className="cute-card p-8">
                  <div className="bg-pink-100 text-pink-500 text-[10px] font-bold px-3 py-1 rounded-full w-fit mb-4 uppercase">Câu {currentQuestionIdx + 1} / {questions.length}</div>
                  <h2 className="text-2xl md:text-3xl font-bold text-zinc-800 leading-tight mb-4">{currentQuestion.question}</h2>
                  {currentQuestion.image && (
                    <div className="w-full max-h-48 rounded-2xl overflow-hidden mb-4 border-4 border-white shadow-sm">
                      <img src={currentQuestion.image} className="w-full h-full object-contain bg-zinc-50" alt="Question" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {currentQuestion.options.map((opt, idx) => (
                    <motion.div 
                      key={idx} 
                      whileHover={{ scale: selectedOption === idx ? 1.08 : 1.03, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      animate={{ 
                        scale: selectedOption === idx ? [1.05, 1.08, 1.05] : 1,
                        backgroundColor: selectedOption === idx ? "#FFB7CE" : "#FFFFFF",
                        color: selectedOption === idx ? "#FFFFFF" : "#52525b",
                        boxShadow: selectedOption === idx ? "0 20px 25px -5px rgba(255, 183, 206, 0.4)" : "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                      }} 
                      transition={{ 
                        scale: selectedOption === idx ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : { type: "spring", stiffness: 300, damping: 20 },
                        backgroundColor: { duration: 0.2 },
                        color: { duration: 0.2 },
                        boxShadow: { duration: 0.2 }
                      }}
                      className={`p-6 rounded-[2rem] font-bold text-xl flex justify-between items-center border-2 transition-all cursor-pointer ${selectedOption === idx ? 'border-pink-200' : 'border-pink-50'}`}
                      onClick={() => setSelectedOption(idx)}
                    >
                      {opt} {selectedOption === idx && (
                        <motion.div 
                          layoutId="cute-cursor" 
                          animate={{ rotate: [0, 15, -15, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="bg-white p-1 rounded-full text-soft-pink shadow-sm"
                        >
                          <Heart size={16} fill="currentColor" />
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {gameState === 'RESULT' && (
              <motion.div 
                key="result" 
                initial={{ scale: 0.8, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                className={`rounded-[2.5rem] p-10 shadow-2xl flex flex-col items-center text-center border-4 border-white ${selectedOption === currentQuestion.correctIndex ? 'bg-green-50 shadow-green-100' : 'bg-red-50 shadow-red-100'}`}
              >
                {selectedOption === currentQuestion.correctIndex ? (
                  <>
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }} 
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="bg-white p-4 rounded-full shadow-lg mb-6 w-32 h-32 flex items-center justify-center overflow-hidden"
                    >
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/en/0/05/Hello_kitty_character_portrait.png" 
                        alt="Happy Kitty" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>
                    <h2 className="text-4xl font-black text-green-500 mb-2">Tuyệt vời! 🌟</h2>
                    <p className="text-green-600 font-medium">Ms Mèo rất vui vì bạn trả lời đúng!</p>
                  </>
                ) : (
                  <>
                    <motion.div 
                      animate={{ x: [-5, 5, -5] }} 
                      transition={{ repeat: Infinity, duration: 0.5 }}
                      className="bg-white p-4 rounded-full shadow-lg mb-6 w-32 h-32 flex items-center justify-center overflow-hidden grayscale"
                    >
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/en/0/05/Hello_kitty_character_portrait.png" 
                        alt="Sad Kitty" 
                        className="w-full h-full object-contain opacity-70"
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>
                    <h2 className="text-4xl font-black text-red-500 mb-2">I'm sorry! 🥺</h2>
                    <p className="text-red-600 font-medium">Đáp án đúng là: <span className="underline font-bold">{currentQuestion.options[currentQuestion.correctIndex]}</span></p>
                  </>
                )}
                <div className="mt-10 flex flex-col items-center gap-4">
                  <button 
                    onClick={handleNext}
                    className="bg-pink-400 text-white px-10 py-3 rounded-2xl font-bold text-lg shadow-lg shadow-pink-100 cute-button flex items-center gap-3"
                  >
                    {currentQuestionIdx < questions.length - 1 ? 'Tiếp tục' : 'Xem kết quả'} 
                    <ChevronRight size={20} />
                  </button>
                  <div className="flex items-center gap-2 text-zinc-400 font-bold animate-pulse text-sm">
                    <Hand size={16} /> Hoặc giơ 2 ngón tay để tiếp tục
                  </div>
                </div>
              </motion.div>
            )}

            {gameState === 'FINISHED' && (
              <motion.div 
                key="finished" 
                initial={{ y: 30, opacity: 0, scale: 0.9 }} 
                animate={{ y: 0, opacity: 1, scale: 1 }} 
                className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-pink-100 text-center border-2 border-pink-50 relative overflow-hidden max-h-[80vh] overflow-y-auto"
              >
                <div className="relative inline-block mb-6">
                  <motion.div
                    animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="w-32 h-32 flex items-center justify-center mx-auto"
                  >
                    <img 
                      src="https://upload.wikimedia.org/wikipedia/en/0/05/Hello_kitty_character_portrait.png" 
                      alt="Winner Kitty" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }} className="absolute -top-4 -right-4 text-soft-yellow"><Trophy size={40} /></motion.div>
                </div>
                <h2 className="text-3xl font-black text-zinc-800 mb-2">Chúc mừng! 🎉</h2>
                <div className="text-xl font-bold text-pink-400 mb-2">Bạn và Ms Mèo đã hoàn thành trò chơi!</div>
                
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

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <motion.div 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-green-50 p-6 rounded-[2rem] border-2 border-green-100 shadow-sm"
                  >
                    <div className="text-green-500 font-black text-4xl mb-1">{score}</div>
                    <div className="text-green-600 text-sm font-bold uppercase tracking-wider">Câu đúng</div>
                  </motion.div>
                  <motion.div 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-red-50 p-6 rounded-[2rem] border-2 border-red-100 shadow-sm"
                  >
                    <div className="text-red-500 font-black text-4xl mb-1">{questions.length - score}</div>
                    <div className="text-red-600 text-sm font-bold uppercase tracking-wider">Câu sai</div>
                  </motion.div>
                </div>

                <div className="flex justify-center mb-8">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setGameState('DETAILS')}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="bg-blue-50 p-6 rounded-[2.5rem] border-4 border-blue-100 shadow-lg group-hover:bg-blue-100 transition-colors">
                      <BookOpen size={60} className="text-blue-400" />
                    </div>
                    <span className="text-blue-500 font-black text-lg">Xem chi tiết</span>
                  </motion.button>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button onClick={resetGame} className="bg-pink-400 text-white px-12 py-4 rounded-3xl font-bold text-xl shadow-lg shadow-pink-200 cute-button flex items-center gap-4">Chơi lại <RefreshCcw /></button>
                  <button onClick={() => setGameState('CERTIFICATE')} className="bg-yellow-400 text-white px-12 py-4 rounded-3xl font-bold text-xl shadow-lg shadow-yellow-200 cute-button flex items-center gap-4">Giấy chứng nhận <Trophy /></button>
                  <button onClick={() => setGameState('START')} className="bg-white text-zinc-500 border-2 border-zinc-100 px-12 py-4 rounded-3xl font-bold text-xl shadow-sm cute-button flex items-center gap-4">Trang chủ <Home size={24} /></button>
                </div>
              </motion.div>
            )}

            {gameState === 'DETAILS' && (
              <motion.div 
                key="details" 
                initial={{ x: 50, opacity: 0 }} 
                animate={{ x: 0, opacity: 1 }} 
                className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-pink-100 border-2 border-pink-50 max-w-4xl mx-auto"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-blue-100 p-3 rounded-2xl">
                    <BookOpen size={32} className="text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-zinc-800">Kết quả chi tiết</h2>
                    <p className="text-zinc-500 font-bold">Xem lại các câu trả lời của bạn</p>
                  </div>
                </div>

                <div className="mb-8 overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm">
                  <div className="bg-pink-50 text-pink-500 font-bold uppercase text-[10px] px-6 py-4 flex items-center justify-between border-b border-pink-100">
                    <span>DANH SÁCH CÂU HỎI</span>
                    <span>{score}/{questions.length} ĐIỂM</span>
                  </div>
                  <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-50 text-zinc-400 font-bold uppercase text-[10px] sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-4">Câu hỏi</th>
                          <th className="px-6 py-4">Bạn chọn</th>
                          <th className="px-6 py-4">Đáp án đúng</th>
                          <th className="px-6 py-4">Kết quả</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-pink-50">
                        {userAnswers.map((ans, i) => (
                          <tr key={i} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-zinc-700">{ans.question}</td>
                            <td className={`px-6 py-4 font-bold ${ans.isCorrect ? 'text-green-500' : 'text-red-400'}`}>{ans.selected}</td>
                            <td className="px-6 py-4 font-bold text-green-500">{ans.correct}</td>
                            <td className="px-6 py-4">
                              {ans.isCorrect ? (
                                <span className="bg-green-100 text-green-600 px-3 py-1.5 rounded-xl text-xs font-black">ĐÚNG</span>
                              ) : (
                                <span className="bg-red-100 text-red-500 px-3 py-1.5 rounded-xl text-xs font-black">SAI</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button onClick={resetGame} className="bg-pink-400 text-white px-10 py-4 rounded-3xl font-bold text-lg shadow-lg shadow-pink-200 cute-button flex items-center gap-3">Chơi lại <RefreshCcw size={20} /></button>
                  <button onClick={() => setGameState('START')} className="bg-white text-zinc-500 border-2 border-zinc-100 px-10 py-4 rounded-3xl font-bold text-lg shadow-sm cute-button flex items-center gap-3">Trang chủ <Home size={20} /></button>
                  <button onClick={() => setGameState('FINISHED')} className="bg-zinc-100 text-zinc-600 px-10 py-4 rounded-3xl font-bold text-lg shadow-sm cute-button flex items-center gap-3">Quay lại <ChevronRight size={20} className="rotate-180" /></button>
                </div>
              </motion.div>
            )}

            {gameState === 'CERTIFICATE' && (
              <motion.div
                key="certificate"
                initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative p-1 bg-gradient-to-br from-yellow-200 via-pink-200 to-yellow-200 rounded-[3rem] shadow-2xl"
              >
                <div className="bg-white rounded-[2.8rem] p-8 md:p-12 border-4 border-double border-yellow-400 relative overflow-hidden text-center">
                  {/* Decorative elements */}
                  <div className="absolute top-0 left-0 w-32 h-32 bg-pink-100 rounded-full -translate-x-16 -translate-y-16 opacity-50" />
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-yellow-100 rounded-full translate-x-16 translate-y-16 opacity-50" />
                  
                  <div className="relative z-10">
                    <div className="flex justify-center mb-6">
                      <div className="bg-yellow-400 p-4 rounded-full shadow-lg shadow-yellow-100">
                        <Trophy size={48} className="text-white" />
                      </div>
                    </div>
                    
                    <h2 className="text-3xl md:text-5xl font-black text-pink-500 mb-2 tracking-tight">GIẤY CHỨNG NHẬN</h2>
                    <p className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-8">Thành tích học tập xuất sắc</p>
                    
                    <div className="mb-8">
                      <p className="text-zinc-500 italic mb-2">Chúc mừng bạn đã hoàn thành thử thách của</p>
                      <h3 className="text-4xl font-black text-pink-400 mb-6">Ms Mèo</h3>
                    </div>
                    
                    <div className="bg-pink-50 rounded-3xl p-8 mb-8 border-2 border-pink-100">
                      <div className="text-pink-500 font-black text-6xl mb-2">{score}/{questions.length}</div>
                      <div className="text-pink-400 font-bold uppercase tracking-widest">ĐIỂM SỐ ĐẠT ĐƯỢC</div>
                    </div>
                    
                    <div className="flex justify-between items-end mt-12">
                      <div className="text-left">
                        <div className="w-32 h-px bg-zinc-200 mb-2" />
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Ngày cấp</p>
                        <p className="text-sm font-bold text-zinc-600">{new Date().toLocaleDateString('vi-VN')}</p>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex justify-end mb-2">
                          <img 
                            src="https://upload.wikimedia.org/wikipedia/en/0/05/Hello_kitty_character_portrait.png" 
                            alt="Signature" 
                            className="w-12 h-12 object-contain opacity-50"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="w-32 h-px bg-zinc-200 mb-2" />
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Chữ ký</p>
                        <p className="text-sm font-black text-pink-400 italic">Ms Mèo</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-center gap-4">
                  <button 
                    onClick={() => setGameState(currentQuestionIdx === questions.length - 1 && userAnswers.length === questions.length ? 'FINISHED' : 'PLAYING')} 
                    className="bg-white text-pink-400 px-8 py-3 rounded-2xl font-bold shadow-sm border-2 border-pink-100 flex items-center gap-2"
                  >
                    Quay lại <ChevronRight />
                  </button>
                  <button 
                    onClick={handleShare} 
                    className="bg-pink-400 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-pink-100 flex items-center gap-2"
                  >
                    Chia sẻ <Share2 size={20} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}

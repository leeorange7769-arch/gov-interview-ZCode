import { useState, useRef, useCallback } from 'react';

export const useDictation = (onResult: (text: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const recRef = useRef<any>(null);

  const toggleListen = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("当前浏览器不支持语音识别"); return; }

    if (isListening) {
      recRef.current?.stop();
      setIsListening(false);
    } else {
      const rec = new SpeechRecognition();
      rec.lang = 'zh-CN';
      rec.continuous = true;
      rec.interimResults = true;

      // 只处理本次新增的、已确定（isFinal）的识别结果，
      // 避免 interimResults 触发的中间结果被反复追加导致文本重复堆叠
      rec.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const result = e.results[i];
          if (result.isFinal) {
            onResult(result[0].transcript);
          }
        }
      };

      // 浏览器可能因静音超时等原因自动结束识别，这里同步重置状态，
      // 避免按钮状态和实际识别状态不一致
      rec.onend = () => setIsListening(false);
      rec.onerror = () => setIsListening(false);

      rec.start();
      recRef.current = rec;
      setIsListening(true);
    }
  }, [isListening, onResult]);

  return { isListening, toggleListen };
};

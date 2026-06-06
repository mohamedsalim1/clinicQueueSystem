import { useCallback, useRef } from 'react';

/**
 * Hook لتشغيل تسلسل من الملفات الصوتية بالتسلسل (Audio Queue).
 *
 * الميزات:
 * - النداءات الجديدة تنتظر دورها ولا تقاطع النداء الجاري
 * - الملفات المفقودة يتم تخطيها تلقائياً (onerror → skip)
 * - play() المرفوض من المتصفح يُتخطى بدلاً من كسر التسلسل
 */
const useVoiceAnnouncements = () => {
  // مرجع للعنصر الصوتي الذي يعمل حالياً
  const activeAudioRef  = useRef(null);
  const queueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const activeSequenceResolveRef = useRef(null);

  /**
   * يوقف أي نداء جارٍ حالياً فوراً
   */
  const stop = useCallback(() => {
    queueRef.current.forEach((item) => item.resolve());
    queueRef.current = [];
    isPlayingRef.current = false;
    stopRequestedRef.current = true;

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.src   = '';
      activeAudioRef.current.onended = null;
      activeAudioRef.current.onerror = null;
      activeAudioRef.current = null;
    }

    activeSequenceResolveRef.current?.();
    activeSequenceResolveRef.current = null;
  }, []);

  const playSequence = useCallback((audioSequence) => {
    return new Promise((resolve) => {
      let index = 0;
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        activeSequenceResolveRef.current = null;
        resolve();
      };

      activeSequenceResolveRef.current = finish;

      const playNext = () => {
        if (stopRequestedRef.current) return finish();
        if (index >= audioSequence.length) return finish();

        const path = audioSequence[index];
        const audio = new Audio(path);
        activeAudioRef.current = audio;

        const moveNext = () => {
          index++;
          playNext();
        };

        audio.onended = moveNext;
        audio.onerror = () => {
          // ملف مفقود أو خطأ → تخطّ وتابع
          console.warn(`[Audio] تخطي الملف المفقود: ${path}`);
          moveNext();
        };

        audio.play().catch(() => {
          // المتصفح رفض التشغيل (حماية Autoplay) → تخطّ وتابع
          moveNext();
        });
      };

      playNext();
    });
  }, []);

  const processQueue = useCallback(async () => {
    if (isPlayingRef.current) return;

    isPlayingRef.current = true;
    stopRequestedRef.current = false;

    while (queueRef.current.length > 0 && !stopRequestedRef.current) {
      const nextItem = queueRef.current.shift();
      await playSequence(nextItem.sequence);
      nextItem.resolve();
    }

    activeAudioRef.current = null;
    isPlayingRef.current = false;
  }, [playSequence]);

  /**
   * يشغل تسلسل ملفات صوتية واحداً تلو الآخر.
   * @param {string[]} audioSequence - مصفوفة مسارات الملفات (مثال: ['/audio/numbers/5.wav'])
   */
  const announce = useCallback((audioSequence) => {
    if (!audioSequence || audioSequence.length === 0) return Promise.resolve();

    return new Promise((resolve) => {
      queueRef.current.push({ sequence: audioSequence, resolve });
      processQueue();
    });
  }, [processQueue]);

  return { announce, stop };
};

export default useVoiceAnnouncements;

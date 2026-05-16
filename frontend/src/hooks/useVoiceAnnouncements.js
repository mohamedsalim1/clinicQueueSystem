import { useCallback } from 'react';

/**
 * Hook لتشغيل تسلسل من الملفات الصوتية (Audio Concatenation)
 */
const useVoiceAnnouncements = () => {
  const announce = useCallback((audioSequence) => {
    if (!audioSequence || audioSequence.length === 0) return;

    let currentIndex = 0;

    const playNext = () => {
      if (currentIndex >= audioSequence.length) return; // انتهت القائمة

      const audioPath = audioSequence[currentIndex];
      const audio = new Audio(audioPath);

      audio.onended = () => {
        currentIndex++;
        playNext(); // تشغيل الملف الذي يليه
      };

      audio.onerror = () => {
        console.warn(`[Audio] Error loading: ${audioPath}, skipping.`);
        currentIndex++;
        playNext(); // تخطي الملف المعطل وتشغيل التالي
      };

      audio.play().catch(err => {
        console.warn('[Audio] Play blocked by browser:', err);
      });
    };

    playNext(); // بدء التشغيل
  }, []);

  return { announce };
};

export default useVoiceAnnouncements;
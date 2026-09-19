import { CaptionCue } from '../types';

/**
 * Sample fixture data for subtitle translation and timedtext URL emulation.
 * Used as fallback data by server.ts, translateService.ts, and subtitleCache.ts.
 * The primary source of truth for demo video FcRzAdI8R9U is the authentic
 * .srt tracks in test/fixtures/languages/*.srt (1,578 cues each).
 */

export const SAMPLE_AUTHENTIC_RUSSIAN_URL =
  'https://www.youtube.com/api/timedtext?v=FcRzAdI8R9U&ei=sample&caps=asr&opi=112496729&exp=xpe&xoaf=5&hl=en&ip=0.0.0.0&ipbits=0&expire=1789803433&sparams=ip%2Cipbits%2Cexpire%2Cv%2Cei%2Ccaps%2Copi%2Cexp%2Cxoaf&signature=sample&key=yt8&lang=ru&fmt=srt';

export const SAMPLE_AUTHENTIC_TIMEDTEXT_HEADERS: Record<string, string> = {
  'accept': 'text/xml,application/json,*/*',
  'accept-language': 'ru-RU,ru;q=0.9,en;q=0.6',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'referer': 'https://www.youtube.com/',
  'origin': 'https://www.youtube.com',
};

export const SAMPLE_AUTHENTIC_RUSSIAN_CUES: CaptionCue[] = [
  { id: 'cue-1', start: 0.5, duration: 4.0, text: 'Здравствуйте, дорогие зрители.' },
  { id: 'cue-2', start: 4.8, duration: 5.2, text: 'Сегодня мы поговорим о языке и культуре.' },
  { id: 'cue-3', start: 10.3, duration: 4.5, text: 'Субтитры помогают следить за речью.' },
  { id: 'cue-4', start: 15.1, duration: 5.0, text: 'Давайте начнём с первого урока.' },
  { id: 'cue-5', start: 20.4, duration: 4.8, text: 'Повторяйте каждое предложение за диктором.' },
  { id: 'cue-6', start: 25.5, duration: 5.2, text: 'Это поможет улучшить ваше произношение.' },
  { id: 'cue-7', start: 31.0, duration: 4.5, text: 'Спасибо за внимание и удачи в обучении!' },
  { id: 'cue-8', start: 35.8, duration: 5.0, text: 'Не забывайте практиковаться каждый день.' },
  { id: 'cue-9', start: 41.1, duration: 4.8, text: 'До новых встреч в следующем видео.' },
  { id: 'cue-10', start: 46.2, duration: 4.5, text: 'Всего доброго и до свидания!' },
];

export const SAMPLE_AUTHENTIC_HEBREW_CUES_FCRZADI8R9U: CaptionCue[] = [
  { id: 'cue-1', start: 0.5, duration: 4.0, text: 'שלום לכל הצופים היקרים.' },
  { id: 'cue-2', start: 4.8, duration: 5.2, text: 'היום נדבר על שפה ותרבות.' },
  { id: 'cue-3', start: 10.3, duration: 4.5, text: 'כתוביות עוזרות לעקוב אחר הדיבור.' },
  { id: 'cue-4', start: 15.1, duration: 5.0, text: 'בואו נתחיל בשיעור הראשון.' },
  { id: 'cue-5', start: 20.4, duration: 4.8, text: 'חזרו על כל משפט אחרי הקריין.' },
  { id: 'cue-6', start: 25.5, duration: 5.2, text: 'זה יעזור לשפר את ההגייה שלכם.' },
  { id: 'cue-7', start: 31.0, duration: 4.5, text: 'תודה על הקשב ובהצלחה בלימוד!' },
  { id: 'cue-8', start: 35.8, duration: 5.0, text: 'אל תשכחו לתרגל כל יום.' },
  { id: 'cue-9', start: 41.1, duration: 4.8, text: 'נתראה בסרטון הבא.' },
  { id: 'cue-10', start: 46.2, duration: 4.5, text: 'להתראות ויום טוב!' },
];

export const SAMPLE_TRANSLATIONS: Record<string, Record<string, string>> = {
  'Здравствуйте, дорогые зрители.': {
    en: 'Hello, dear viewers.',
    he: 'שלום לכל הצופים היקרים.',
    it: 'Ciao, cari spettatori.',
    ar: 'مرحبا المشاهدين الأعزاء.',
    ru: 'Здравствуйте, дорогие зрители.',
  },
  'Сегодня мы поговорим о языке и культуре.': {
    en: 'Today we will talk about language and culture.',
    he: 'היום נדבר על שפה ותרבות.',
    it: 'Oggi parleremo di lingua e cultura.',
    ar: 'اليوم سنتحدث عن اللغة والثقافة.',
    ru: 'Сегодня мы поговорим о языке и культуре.',
  },
  'Субтитры помогают следить за речью.': {
    en: 'Subtitles help follow the speech.',
    he: 'כתוביות עוזרות לעקוב אחר הדיבור.',
    it: 'I sottotitoli aiutano a seguire il discorso.',
    ar: 'الترجمة تساعد على متابعة الكلام.',
    ru: 'Субтитры помогают следить за речью.',
  },
  'Давайте начнём с первого урока.': {
    en: "Let's start with the first lesson.",
    he: 'בואו נתחיל בשיעור הראשון.',
    it: 'Iniziamo con la prima lezione.',
    ar: 'لنبدأ بالدرس الأول.',
    ru: 'Давайте начнём с первого урока.',
  },
  'Повторяйте каждое предложение за диктором.': {
    en: 'Repeat each sentence after the narrator.',
    he: 'חזרו על כל משפט אחרי הקריין.',
    it: 'Ripetete ogni frase dopo il narratore.',
    ar: 'كرروا كل جملة بعد المعلق.',
    ru: 'Повторяйте каждое предложение за диктором.',
  },
  'Это поможет улучшить ваше произношение.': {
    en: 'This will help improve your pronunciation.',
    he: 'זה יעזור לשפר את ההגייה שלכם.',
    it: 'Questo aiuterà a migliorare la pronuncia.',
    ar: 'هذا سيساعد في تحسين نطقكم.',
    ru: 'Это поможет улучшить ваше произношение.',
  },
  'Спасибо за внимание и удачи в обучении!': {
    en: 'Thank you for your attention and good luck learning!',
    he: 'תודה על הקשב ובהצלחה בלימוד!',
    it: 'Grazie per l attenzione e buon apprendimento!',
    ar: 'شكرا على الانتباه وحظا موفقا في التعلم!',
    ru: 'Спасибо за внимание и удачи в обучении!',
  },
  'Не забывайте практиковаться каждый день.': {
    en: 'Do not forget to practice every day.',
    he: 'אל תשכחו לתרגל כל יום.',
    it: 'Non dimenticate di esercitarvi ogni giorno.',
    ar: 'لا تنسوا التدرب كل يوم.',
    ru: 'Не забывайте практиковаться каждый день.',
  },
  'До новых встреч в следующем видео.': {
    en: 'See you in the next video.',
    he: 'נתראה בסרטון הבא.',
    it: 'Ci vediamo nel prossimo video.',
    ar: 'نراك في الفيديو القادم.',
    ru: 'До новых встреч в следующем видео.',
  },
  'Всего доброго и до свидания!': {
    en: 'All the best and goodbye!',
    he: 'להתראות ויום טוב!',
    it: 'Tutto il meglio e arrivederci!',
    ar: 'كل التوفيق والوداع!',
    ru: 'Всего доброго и до свидания!',
  },
};

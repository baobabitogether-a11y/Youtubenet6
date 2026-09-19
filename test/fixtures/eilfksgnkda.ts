import { CaptionCue } from '../../src/types';
import { parseRawCaptionData } from '../../src/utils/captionParser';

// Authentic YouTube JSON3 timedtext format for video EILFkSGNkdA
// English source track (lang=en, fmt=json3)
const eilfkEnJson3 = JSON.stringify({
  events: [
    { tStartMs: 0, dDurationMs: 4000, segs: [{ utf8: 'Hey everyone, welcome back to the channel.' }] },
    { tStartMs: 4000, dDurationMs: 3500, segs: [{ utf8: 'Today we are looking at something really interesting.' }] },
    { tStartMs: 7500, dDurationMs: 4000, segs: [{ utf8: "So let's dive right in and see what we've got here." }] },
    { tStartMs: 11500, dDurationMs: 3800, segs: [{ utf8: 'The first thing you will notice is the layout.' }] },
    { tStartMs: 15300, dDurationMs: 4200, segs: [{ utf8: 'It is designed to be clean and easy to navigate.' }] },
    { tStartMs: 19500, dDurationMs: 3500, segs: [{ utf8: 'You can see all the options right here at the top.' }] },
    { tStartMs: 23000, dDurationMs: 4000, segs: [{ utf8: 'And if you click on any of them, you get more details.' }] },
    { tStartMs: 27000, dDurationMs: 3800, segs: [{ utf8: 'Now, one of the coolest features is the search.' }] },
    { tStartMs: 30800, dDurationMs: 4200, segs: [{ utf8: 'You can type anything and it finds it instantly.' }] },
    { tStartMs: 35000, dDurationMs: 3500, segs: [{ utf8: 'Let me show you an example of how that works.' }] },
    { tStartMs: 38500, dDurationMs: 4000, segs: [{ utf8: 'So I am going to type in a keyword right now.' }] },
    { tStartMs: 42500, dDurationMs: 3800, segs: [{ utf8: 'And you can see the results come up immediately.' }] },
    { tStartMs: 46300, dDurationMs: 4200, segs: [{ utf8: 'This is really fast and saves a lot of time.' }] },
    { tStartMs: 50500, dDurationMs: 3500, segs: [{ utf8: 'Another thing I want to mention is the settings.' }] },
    { tStartMs: 54000, dDurationMs: 4000, segs: [{ utf8: 'You can customize almost everything in here.' }] },
    { tStartMs: 58000, dDurationMs: 3800, segs: [{ utf8: 'From the theme to the language to the layout.' }] },
    { tStartMs: 61800, dDurationMs: 4200, segs: [{ utf8: 'It really makes the whole experience personal.' }] },
    { tStartMs: 66000, dDurationMs: 3500, segs: [{ utf8: 'And that is what makes this so much better.' }] },
    { tStartMs: 69500, dDurationMs: 4000, segs: [{ utf8: 'Alright, so that is the main overview for today.' }] },
    { tStartMs: 73500, dDurationMs: 3800, segs: [{ utf8: 'If you found this helpful, give it a like.' }] },
    { tStartMs: 77300, dDurationMs: 4200, segs: [{ utf8: 'Subscribe for more content like this. See you next time!' }] },
  ],
});

// Hebrew translation track (tlang=iw, fmt=json3)
const eilfkHeJson3 = JSON.stringify({
  events: [
    { tStartMs: 0, dDurationMs: 4000, segs: [{ utf8: 'היי כולם, ברוכים הבאים בחזרה לערוץ.' }] },
    { tStartMs: 4000, dDurationMs: 3500, segs: [{ utf8: 'היום אנחנו מסתכלים על משהו ממש מעניין.' }] },
    { tStartMs: 7500, dDurationMs: 4000, segs: [{ utf8: 'אז בואו נקפוץ פנימה ונראה מה יש לנו פה.' }] },
    { tStartMs: 11500, dDurationMs: 3800, segs: [{ utf8: 'הדבר הראשון שתשימו לב אליו הוא העיצוב.' }] },
    { tStartMs: 15300, dDurationMs: 4200, segs: [{ utf8: 'הוא מעוצב להיות נקי וקל לניווט.' }] },
    { tStartMs: 19500, dDurationMs: 3500, segs: [{ utf8: 'אפשר לראות את כל האפשרויות פה למעלה.' }] },
    { tStartMs: 23000, dDurationMs: 4000, segs: [{ utf8: 'ואם תלחצו על כל אחת מהן, תקבלו פרטים נוספים.' }] },
    { tStartMs: 27000, dDurationMs: 3800, segs: [{ utf8: 'עכשיו, אחת התכונות הכי מגניבות זה החיפוש.' }] },
    { tStartMs: 30800, dDurationMs: 4200, segs: [{ utf8: 'אפשר להקליד כל דבר וזה מוצא את זה מיד.' }] },
    { tStartMs: 35000, dDurationMs: 3500, segs: [{ utf8: 'בואו אראה לכם דוגמה איך זה עובד.' }] },
    { tStartMs: 38500, dDurationMs: 4000, segs: [{ utf8: 'אז אני אקליד מילת חיפוש עכשיו.' }] },
    { tStartMs: 42500, dDurationMs: 3800, segs: [{ utf8: 'ואפשר לראות שהתוצאות עולות מיד.' }] },
    { tStartMs: 46300, dDurationMs: 4200, segs: [{ utf8: 'זה ממש מהיר וחוסך הרבה זמן.' }] },
    { tStartMs: 50500, dDurationMs: 3500, segs: [{ utf8: 'דבר נוסף שאני רוצה להזכיר זה ההגדרות.' }] },
    { tStartMs: 54000, dDurationMs: 4000, segs: [{ utf8: 'אפשר להתאים כמעט כל דבר פה.' }] },
    { tStartMs: 58000, dDurationMs: 3800, segs: [{ utf8: 'מהערכת נושא ועד השפה והעיצוב.' }] },
    { tStartMs: 61800, dDurationMs: 4200, segs: [{ utf8: 'זה באמת הופך את כל החוויה לאישית.' }] },
    { tStartMs: 66000, dDurationMs: 3500, segs: [{ utf8: 'וזה מה שהופך את זה להרבה יותר טוב.' }] },
    { tStartMs: 69500, dDurationMs: 4000, segs: [{ utf8: 'בסדר, אז זה הסקירה הראשית להיום.' }] },
    { tStartMs: 73500, dDurationMs: 3800, segs: [{ utf8: 'אם זה עזר לכם, תנו לייק.' }] },
    { tStartMs: 77300, dDurationMs: 4200, segs: [{ utf8: 'תתחברו לעוד תכנים כאלה. נתראה בפעם הבאה!' }] },
  ],
});

export const EILFKSGNKDA_EN_CUES: CaptionCue[] = parseRawCaptionData(eilfkEnJson3).cues;
export const EILFKSGNKDA_HE_CUES: CaptionCue[] = parseRawCaptionData(eilfkHeJson3).cues;

export const EILFKSGNKDA_LANGUAGE_TRACKS: Record<string, CaptionCue[]> = {
  en: EILFKSGNKDA_EN_CUES,
  he: EILFKSGNKDA_HE_CUES,
  iw: EILFKSGNKDA_HE_CUES,
};

export const EILFKSGNKDA_RAW_JSON3 = {
  en: eilfkEnJson3,
  iw: eilfkHeJson3,
  he: eilfkHeJson3,
};

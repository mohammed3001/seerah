import dayjs from "dayjs";
import "dayjs/locale/ar";
import relativeTime from "dayjs/plugin/relativeTime";
import updateLocale from "dayjs/plugin/updateLocale";

dayjs.extend(relativeTime);
dayjs.extend(updateLocale);
dayjs.locale("ar");

/**
 * Returns "منذ ساعتين" / "منذ يومين" style relative time in Arabic.
 */
export function relativeTimeAr(date: string | number | Date): string {
  return dayjs(date).fromNow();
}

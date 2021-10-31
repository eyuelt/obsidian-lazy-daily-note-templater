import type { Moment } from "moment";

// TODO(eht): Support {{title}} {{date}} {{time}}, just like Daily Notes
// https://help.obsidian.md/Plugins/Templates
// https://help.obsidian.md/Plugins/Daily+notes#Templates

const kDefaultDateFormat = 'YYYY-MM-DD';
const kDefaultTimeFormat = 'HH:MM:SS';

export function instantiateTemplateForDate(templateContents: string, date: Moment): string {
  return templateContents
  // copied from https://github.com/liamcain/obsidian-daily-notes-interface/blob/main/src/daily.ts
  // example formats:
  //   {{date:YYYY-MM-DD}} = today
  //   {{date+1y:YYYY-MM-DD}} = one year from now
  //   {{date-2d:YYYY-MM-DD}} = 2 days ago
      .replace(
        /{{(date|time)(([+-]\d+)([yqmwdhs]))?(:.+?)?}}/gi,
        (_, _timeOrDate, calc, timeDelta, unit, momentFormat) => {
          const now = moment();
          const currentDate = date.clone().set({
            hour: now.get("hour"),
            minute: now.get("minute"),
            second: now.get("second"),
          });
          if (calc) {
            currentDate.add(parseInt(timeDelta, 10), unit);
          }
          if (momentFormat) {
            return currentDate.format(momentFormat.substring(1));
          }
          const format = _timeOrDate === 'time' ? kDefaultTimeFormat : kDefaultDateFormat;
          return currentDate.format(format);
        }
      )
      .replace(
        /{{yesterday}}/gi,
        date.clone().subtract(1, "day").format(kDefaultDateFormat)
      )
      .replace(
        /{{tomorrow}}/gi,
        date.clone().add(1, "day").format(kDefaultDateFormat)
      );
};


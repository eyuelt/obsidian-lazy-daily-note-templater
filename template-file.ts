import type { Moment } from "moment";

// Support all template parameters that the Daily Notes core plugin supports.
// Currently just {{title}}, {{date}}, and {{time}}.
// https://help.obsidian.md/Plugins/Templates
// https://help.obsidian.md/Plugins/Daily+notes#Templates

const kDefaultDateFormat = 'YYYY-MM-DD';
const kDefaultTimeFormat = 'HH:MM:SS';

export function instantiateTemplateForDate(filename: string, templateContents: string, date: Moment): string {
  return templateContents
      .replace(/{{title}}/gi, filename)
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
      );
};


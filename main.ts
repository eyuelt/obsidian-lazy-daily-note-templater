// lazy-daily-note-templater
//
// Currently, clicking on a link to a daily note that doesn't yet exist (aka a
// lazily initialized daily note) creates a blank page. This plugin populates
// it with the template specified in the Daily Notes core plugin settings.
//
// As a bonus, this plugin also allows for some expanded date/time templating.

// Note: If a daily note is created in a way that triggers the Daily Notes core
// plugin, it's unclear which plugin will run first. Whichever one runs last
// will overwrite the other. Since we're using the same template and support all
// of the same template variables, it doesn't matter much which one wins.

import type { Moment } from "moment";
import moment from "moment";
import { Plugin, Notice, TAbstractFile, TFile, normalizePath } from 'obsidian';
import {
  appHasDailyNotesPluginLoaded,
  getDailyNoteSettings,
} from "obsidian-daily-notes-interface";
import { instantiateTemplateForDate, } from './template-file';

const kRecentlyCreatedThresholdMillis: number = 1000;

export default class LazyDailyNoteTemplaterPlugin extends Plugin {
  async onload() {
    try {
      // Give the Daily Notes plugin a chance to load.
      await this.waitForDailyNotesPluginWithTimeout(/*waitMillis=*/1000);
      this.setupPlugin();
    } catch(err) {
      new Notice('LazyDailyNoteTemplater plugin requires Daily Notes plugin to be enabled');
      console.log(err);
    }
  }

  // Assumes Daily Notes plugin is loaded.
  private setupPlugin() {
    const onFileCreate = (newFile: TAbstractFile) => {
      let dailyNoteSettings = getDailyNoteSettings();
      // For some reason, sometimes the file extension is missing.
      if (!dailyNoteSettings.template.endsWith('.md')) {
        dailyNoteSettings.template += '.md';
      }

      // Filter out the following:
      //   - Folders. This function is called on creation of each TAbstractFile,
      //     which TFolder is a subclass of.
      //   - Files that are not daily notes.
      //   - Files that are not newly created. Although this function is
      //     triggered by the vault's 'create' event, that refers to the
      //     creation of the in-memory file, so we still need to refer to the
      //     creation time of the stored file.
      if (!(newFile instanceof TFile)
          || !this.isDailyNoteFile(newFile, dailyNoteSettings)
          || !this.isFileNewlyCreated(newFile)) {
        return;
      }

      const templateFile: TAbstractFile =
          this.app.vault.getAbstractFileByPath(dailyNoteSettings.template);

      // Nothing to do if the template file doesn't exist or is not a file.
      if (templateFile === null || !(templateFile instanceof TFile)) {
        new Notice('Invalid Daily Notes template file');
        console.error(`Invalid Daily Notes template file "${dailyNoteSettings.template}".`);
        return;
      }

      this.app.vault.read(templateFile).then((contents: string) => {
        const date: Moment =
            this.parseDateWithFormat(newFile.basename, dailyNoteSettings.format);
        this.app.vault.modify(newFile,
            instantiateTemplateForDate(newFile.basename, contents, date));
      }).catch((err) => {
        console.log(err);
      });
    };

    this.registerEvent(this.app.vault.on('create', onFileCreate));
  }

  private waitForDailyNotesPluginWithTimeout(waitMillis: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = moment.now();
      const intervalId = window.setInterval(() => {
        if (appHasDailyNotesPluginLoaded()) {
          clearInterval(intervalId);
          resolve();
        } else if (moment.now() - startTime > waitMillis) {
          clearInterval(intervalId);
          reject();
        }
      }, 100);
      this.registerInterval(intervalId);
    });
  }

  // Uses file creation time to determine whether the file is new.
  private isFileNewlyCreated(f: TFile): boolean {
    return (moment.now() - f.stat.ctime < kRecentlyCreatedThresholdMillis);
  };

  // Determines if the file is a daily note, based on the Daily Notes plugin
  // settings.
  private isDailyNoteFile(f: TFile, dailyNoteSettings: any): boolean {
    return f.path.startsWith(`${normalizePath(dailyNoteSettings.folder)}/`) &&
        this.parseDateWithFormat(f.basename, dailyNoteSettings.format).isValid();
  }

  // Parses the dateString with the given format using the Moment library.
  private parseDateWithFormat(dateString: string, format: string): Moment {
    return moment(dateString, format, /*strictMode=*/true);
  };
}

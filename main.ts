// // TODO(eht)

// Note: if an actual daily note is created, it's unclear which plugin
// will run first, this one or the Daily Note core plugin. Whichever one
// runs last will overwrite the other. Since we're using the same
// template, it doesn't matter which one wins.

// creating a new Daily Note (must match daily note format) in the Daily Notes
// directory (as defined by the Daily Notes core plugin settings) triggers our
// plugin to use the template to populate that new file (needs to handle future
// dates, obviously).

import type { Moment } from "moment";
import moment from "moment";
import { Plugin, Notice, TAbstractFile, TFile, normalizePath } from 'obsidian';
import {
  appHasDailyNotesPluginLoaded,
  getDailyNoteSettings,
} from "obsidian-daily-notes-interface";
import { instantiateTemplateForDate, } from './template-file';

const kRecentlyCreatedThresholdMillis: number = 1000;

export default class MyPlugin extends Plugin {  // TODO(eht): rename
  async onload() {
    try {
      // Give the Daily Note plugin a chance to load.
      await this.waitForDailyNotesPluginWithTimeout(/*waitMillis=*/1000);
      this.setupPlugin();
    } catch(err) {
      new Notice('_ plugin requires Daily Notes plugin to be enabled');
      console.log(err);
    }
  }

  // Assumes Daily Note plugin is loaded.
  private setupPlugin() {
    const onFileCreate = (newFile: TAbstractFile) => {
      let dailyNoteSettings = getDailyNoteSettings();
      // For some reason, sometimes the extension is missing.
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

      const templateFile: TAbstractFile = this.app.vault.getAbstractFileByPath(dailyNoteSettings.template);

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
            instantiateTemplateForDate(contents, date));
      }).catch((err) => {
        console.log(err);
      });
    }

    this.registerEvent(this.app.vault.on('create', onFileCreate));
  }

  private waitForDailyNotesPluginWithTimeout(waitMillis: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // TODO(eht): maybe stick to moment, rather than Date
      const startTime = Date.now();
      const intervalId = window.setInterval(() => {
        if (appHasDailyNotesPluginLoaded()) {
          clearInterval(intervalId);
          resolve();
        } else if (Date.now() - startTime > waitMillis) {
          clearInterval(intervalId);
          reject();
        }
      }, 100);
      this.registerInterval(intervalId);
    });
  }

  // Uses file creation time to determine whether the file is new.
  private isFileNewlyCreated(f: TFile): boolean {
    // TODO(eht): maybe stick to moment, rather than Date
    return (Date.now() - f.stat.ctime < kRecentlyCreatedThresholdMillis);
  };

  // Determines if the file is a daily note, based on the Daily Notes plugin
  // settings.
  private isDailyNoteFile(f: TFile, dailyNoteSettings: any): boolean {  // TODO(eht): any
    return f.path.startsWith(`${normalizePath(dailyNoteSettings.folder)}/`) &&
        this.parseDateWithFormat(f.basename, dailyNoteSettings.format).isValid();
  }

  // Parses the dateString with the given format using the Moment library.
  private parseDateWithFormat(dateString: string, format: string): Moment {
    return moment(dateString, format, /*strictMode=*/true);
  };
}

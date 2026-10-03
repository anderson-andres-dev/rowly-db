import { describe, expect, it } from "vitest";
import { get } from "svelte/store";
import { createQueryConsole, queryConsoles, updateQueryConsoleSql } from "$lib/stores/queryConsoles";
import { createConsoleFiles, type FileBackend, type FilesView } from "./consoleFiles";

let counter = 0;

function fixture(options: { save?: () => Promise<boolean>; discard?: boolean } = {}) {
  const profileId = `files-${++counter}`;
  const forgotten: string[] = [];
  const errors: unknown[] = [];
  const saved: string[] = [];
  const renamedFiles: [string, string][] = [];
  const view: FilesView = {
    profileId: () => profileId,
    displayTitle: (title) => `«${title}»`,
    fallbackTitle: () => "console",
    confirmDiscard: async () => options.discard ?? true,
    forgetResults: (id) => forgotten.push(id),
    notifyError: (error) => errors.push(error),
  };
  const backend: FileBackend = {
    save: async (item) => {
      saved.push(item.id);
      return options.save ? options.save() : true;
    },
    saveAs: async () => true,
    open: async () => true,
    renameFile: async (id, name) => {
      renamedFiles.push([id, name]);
    },
  };
  const files = createConsoleFiles(view, backend);
  const open = () => get(queryConsoles).consoles.filter((item) => item.profileId === profileId).map((item) => item.id);
  return { profileId, files, forgotten, errors, saved, renamedFiles, open };
}

describe("createConsoleFiles", () => {
  it("closes a console with nothing to lose without asking, and forgets its results", async () => {
    const files = fixture();
    const id = createQueryConsole(files.profileId);
    await files.files.requestClose(id);
    expect(files.open()).toEqual([]);
    expect(get(files.files.pendingClose)).toBeNull();
    expect(files.forgotten).toEqual([id]);
  });

  it("asks before closing a console with text, with its title frozen", async () => {
    const files = fixture();
    const id = createQueryConsole(files.profileId);
    updateQueryConsoleSql(id, "SELECT 1");
    await files.files.requestClose(id);
    const title = get(queryConsoles).consoles.find((item) => item.id === id)!.title;
    expect(get(files.files.pendingClose)).toEqual({ id, title: `«${title}»` });
    expect(files.open()).toEqual([id]);
  });

  it("save and close keeps the tab open when the save is cancelled or fails", async () => {
    const cancelled = fixture({ save: async () => false });
    const failed = fixture({ save: () => Promise.reject(new Error("disk full")) });
    for (const files of [cancelled, failed]) {
      const id = createQueryConsole(files.profileId);
      updateQueryConsoleSql(id, "SELECT 1");
      await files.files.requestClose(id);
      await files.files.saveAndClose();
      expect(files.open()).toEqual([id]);
      expect(get(files.files.pendingClose)).toBeNull();
    }
    expect(failed.errors).toEqual([new Error("disk full")]);
  });

  it("save and close closes after saving; discard closes without saving; cancel keeps it", async () => {
    const files = fixture();
    const [saved, discarded, kept] = [1, 2, 3].map(() => {
      const id = createQueryConsole(files.profileId);
      updateQueryConsoleSql(id, "SELECT 1");
      return id;
    });
    await files.files.requestClose(saved);
    await files.files.saveAndClose();
    await files.files.requestClose(discarded);
    files.files.discardAndClose();
    await files.files.requestClose(kept);
    files.files.cancelClose();
    expect(files.saved).toEqual([saved]);
    expect(files.open()).toEqual([kept]);
  });

  it("closes nothing while the user keeps pending grid edits", async () => {
    const files = fixture({ discard: false });
    const id = createQueryConsole(files.profileId);
    await files.files.requestClose(id);
    expect(files.open()).toEqual([id]);
  });

  it("confirming the translated default name unchanged does not store it translated", () => {
    const files = fixture();
    const id = createQueryConsole(files.profileId);
    const title = get(queryConsoles).consoles.find((item) => item.id === id)!.title;
    files.files.rename(id, `«${title}»`);
    expect(get(queryConsoles).consoles.find((item) => item.id === id)!.title).toBe(title);
    files.files.rename(id, "informe");
    expect(get(queryConsoles).consoles.find((item) => item.id === id)!.title).toBe("informe");
    expect(files.renamedFiles).toEqual([]);
  });
});

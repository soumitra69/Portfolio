import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import seedProjects from "../shared/projects.json" with { type: "json" };
import seedSkills from "../shared/skills.json" with { type: "json" };
import defaultProfile from "../shared/profile.json" with { type: "json" };

export function createStore(filename = process.env.DATA_FILE || fileURLToPath(new URL("../data/portfolio.json", import.meta.url))) {
  let queue = Promise.resolve();

  async function read() {
    try {
      const data = JSON.parse(await readFile(filename, "utf8"));
      return { skills: structuredClone(seedSkills), experience: [], ...data, profile: { ...defaultProfile, ...data.profile } };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      return { messages: [], projects: structuredClone(seedProjects), skills: structuredClone(seedSkills), experience: [], profile: { ...defaultProfile } };
    }
  }

  function update(action) {
    const task = queue.then(async () => {
      const data = await read();
      const result = action(data);
      await mkdir(dirname(filename), { recursive: true });
      const temporary = `${filename}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(data, null, 2), { mode: 0o600 });
      await rename(temporary, filename);
      return result;
    });
    queue = task.catch(() => {});
    return task;
  }

  return { read: () => queue.then(read), update };
}

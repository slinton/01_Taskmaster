/**
 * model-tests.js
 * Small self-checking tests for Project and Task.
 * Works in a browser (see model-tests.html) or in Node:
 *   node dev/model-tests.js
 */

import { Project } from "../models/project.js";
import { Task } from "../models/task.js";

/** Run every test and return a list of { label, ok, error } results. */
export function runTests() {
  const results = [];

  // Run one test. A thrown error means the test failed.
  function test(label, fn) {
    try {
      fn();
      results.push({ label, ok: true });
    } catch (error) {
      results.push({ label, ok: false, error: error.message });
    }
  }

  function check(condition, message = "check failed") {
    if (!condition) throw new Error(message);
  }

  function throws(fn, message) {
    try {
      fn();
    } catch {
      return;
    }
    throw new Error(message ?? "expected an error but none was thrown");
  }

  const names = (projects) => projects.map((p) => p.name).join();

  // --- Projects ---

  test("a new root is a root with nothing in it", () => {
    const root = Project.createRoot();
    check(root.isRoot);
    check(root.parent === null);
    check(root.children.length === 0 && root.tasks.length === 0);
  });

  test("a project needs a name", () => {
    throws(() => new Project(""));
    throws(() => new Project("   "));
    throws(() => Project.createRoot().addChild(null));
  });

  test("subprojects are added at the end, in order", () => {
    const root = Project.createRoot();
    root.addChild("A");
    root.addChild("B");
    root.addChild("C");
    check(names(root.children) === "A,B,C");
  });

  test("subprojects know their parent, and path runs root to project", () => {
    const root = Project.createRoot();
    const a = root.addChild("A");
    const b = a.addChild("B");
    const c = b.addChild("C");
    check(c.parent === b && b.parent === a && a.parent === root);
    check(names(c.path) === "All Projects,A,B,C");
    check(!a.isRoot && !c.isRoot);
  });

  test("depth is unlimited (200 levels)", () => {
    const root = Project.createRoot();
    let project = root;
    for (let i = 0; i < 200; i++) project = project.addChild(`Level ${i}`);
    check(project.path.length === 201);
    check(root.descendants.length === 200);
  });

  test("removing a project removes its subprojects and tasks with it", () => {
    const root = Project.createRoot();
    const a = root.addChild("A");
    const b = a.addChild("B");
    b.addTask("In B");
    a.addTask("In A");
    root.addChild("Keep").addTask("In Keep");

    a.remove();

    check(names(root.children) === "Keep");
    check(root.descendants.length === 1);
    check(root.allTasks.map((t) => t.title).join() === "In Keep");
    check(root.find(b.id) === undefined);
  });

  test("a removed project cannot be removed again", () => {
    const root = Project.createRoot();
    const a = root.addChild("A");
    a.remove();
    check(a.parent === null && !a.isRoot);
    throws(() => a.remove());
  });

  test("the root cannot be removed, renamed or archived", () => {
    const root = Project.createRoot();
    throws(() => root.remove());
    throws(() => root.rename("Other"));
    throws(() => root.archive());
    check(root.name === "All Projects" && !root.archived);
  });

  test("other projects can be renamed and archived", () => {
    const a = Project.createRoot().addChild("A");
    a.rename("  Renamed ");
    check(a.name === "Renamed");
    throws(() => a.rename(""));
    a.archive();
    check(a.archived);
    a.unarchive();
    check(!a.archived);
  });

  test("a new project goes to the end even after a removal", () => {
    const root = Project.createRoot();
    root.addChild("A");
    const b = root.addChild("B");
    root.addChild("C");
    b.remove();
    root.addChild("D");
    check(names(root.children) === "A,C,D");
  });

  test("children and tasks lists are copies", () => {
    const root = Project.createRoot();
    root.addChild("A");
    root.addTask("Do it");
    root.children.push("junk");
    root.tasks.length = 0;
    check(root.children.length === 1 && root.tasks.length === 1);
  });

  test("find and findTask look through the whole tree", () => {
    const root = Project.createRoot();
    const a = root.addChild("A");
    const b = a.addChild("B");
    const task = b.addTask("Deep");
    check(root.find(b.id) === b);
    check(root.find("nope") === undefined);
    check(root.findTask(task.id) === task);
    check(a.find(root.id) === undefined, "find only looks downward");
  });

  // --- Tasks ---

  test("a task needs a title", () => {
    const root = Project.createRoot();
    throws(() => root.addTask(""));
    throws(() => root.addTask("   "));
    throws(() => new Task(null, root));
  });

  test("a task needs a project", () => {
    throws(() => new Task("Do it"));
    throws(() => new Task("Do it", null));
    throws(() => new Task("Do it", "p1"));
  });

  test("a task belongs to exactly one project", () => {
    const root = Project.createRoot();
    const a = root.addChild("A");
    const b = root.addChild("B");
    const task = a.addTask("Do it");
    check(task.project === a && task.projectId === a.id);
    check(a.tasks.includes(task) && !b.tasks.includes(task));
    check(root.allTasks.filter((t) => t === task).length === 1);
  });

  test("a task's project cannot be changed afterward", () => {
    const root = Project.createRoot();
    const a = root.addChild("A");
    const b = root.addChild("B");
    const task = a.addTask("Do it");
    throws(() => {
      task.project = b;
    });
    check(task.project === a);
  });

  test("tasks keep the order they were added in", () => {
    const root = Project.createRoot();
    root.addTask("One");
    root.addTask("Two");
    root.addTask("Three");
    check(root.tasks.map((t) => t.title).join() === "One,Two,Three");
  });

  test("tasks gives a project's own tasks, allTasks includes subprojects", () => {
    const root = Project.createRoot();
    const a = root.addChild("A");
    const b = a.addChild("B");
    const c = root.addChild("C");
    a.addTask("In A");
    b.addTask("In B");
    c.addTask("In C");
    check(a.tasks.map((t) => t.title).join() === "In A");
    check(a.allTasks.map((t) => t.title).join() === "In A,In B");
    check(root.allTasks.length === 3);
  });

  test("a task can be removed from its project", () => {
    const root = Project.createRoot();
    const keep = root.addTask("Keep");
    const gone = root.addTask("Gone");
    gone.remove();
    check(root.tasks.length === 1 && root.tasks[0] === keep);
    throws(() => gone.remove());
    throws(() => root.removeTask("no-such-id"));
  });

  test("complete and reopen update the task", () => {
    const task = Project.createRoot().addTask("Do it");
    check(!task.completed && task.completedAt === null);
    task.complete();
    check(task.completed && typeof task.completedAt === "string");
    task.reopen();
    check(!task.completed && task.completedAt === null);
  });

  // --- Saving and loading ---

  function sampleTree() {
    const root = Project.createRoot();
    root.addTask("Top task");
    const a = root.addChild("A", { description: "first" });
    a.addTask("In A", { description: "soon" }).complete();
    a.addChild("B").addTask("In B");
    root.addChild("C").archive();
    return root;
  }

  test("saving and loading keeps everything", () => {
    const root = sampleTree();
    const copy = Project.loadRoot(JSON.parse(JSON.stringify(root)));
    check(JSON.stringify(copy) === JSON.stringify(root));
  });

  test("a loaded tree is properly linked", () => {
    const copy = Project.loadRoot(JSON.parse(JSON.stringify(sampleTree())));
    check(copy.isRoot && copy.parent === null);
    const a = copy.children[0];
    check(!a.isRoot && a.parent === copy);
    check(a.children[0].parent === a);
    check(a.tasks[0].project === a && a.tasks[0].completed);
    check(names(a.children[0].path) === "All Projects,A,B");
    throws(() => copy.rename("Other"));
  });

  test("loading keeps the order of subprojects and tasks", () => {
    const root = Project.createRoot();
    root.addChild("A");
    root.addChild("B");
    root.addChild("C");
    root.addTask("One");
    root.addTask("Two");
    const copy = Project.loadRoot(JSON.parse(JSON.stringify(root)));
    check(names(copy.children) === "A,B,C");
    check(copy.tasks.map((t) => t.title).join() === "One,Two");
  });

  test("loading data with a duplicate project id fails", () => {
    const data = {
      name: "Root",
      children: [
        { id: "x", name: "One" },
        { id: "x", name: "Two" },
      ],
    };
    throws(() => Project.loadRoot(data));
  });

  test("loading data with a duplicate task id fails", () => {
    const data = {
      name: "Root",
      tasks: [
        { id: "x", title: "One" },
        { id: "x", title: "Two" },
      ],
    };
    throws(() => Project.loadRoot(data));
  });

  test("loading data with a missing name or title fails", () => {
    throws(() => Project.loadRoot({ children: [] }));
    throws(() => Project.loadRoot({ name: "Root", children: [{ id: "x" }] }));
    throws(() => Project.loadRoot({ name: "Root", tasks: [{ id: "x" }] }));
  });

  test("loading data with only a name gives an empty root", () => {
    const root = Project.loadRoot({ name: "Root" });
    check(root.isRoot && root.children.length === 0 && root.tasks.length === 0);
  });

  return results;
}

// When run directly with Node, print a report.
if (typeof process !== "undefined" && process.argv?.[1]?.endsWith("model-tests.js")) {
  const results = runTests();
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.ok ? "" : ` (${r.error})`}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

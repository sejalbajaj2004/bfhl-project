const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors()); // Allow requests from any origin (frontend, evaluator)
app.use(express.json()); // Parse JSON body

const USER_ID = "sejalbajaj_16112004";       // replace DDMMYYYY with your actual DOB
const EMAIL_ID = "sejal1127.be23@chitkara.edu.in"; // your actual college email
const COLLEGE_ROLL_NUMBER = "2310991127";

// ─── Helper: check if an entry is a valid node string like "A->B" ───
function isValidEntry(entry) {
  // Trim spaces first
  entry = entry.trim();

  // Must match exactly: single uppercase letter -> single uppercase letter
  const regex = /^[A-Z]->[A-Z]$/;

  // Also reject self-loops like A->A
  if (!regex.test(entry)) return false;
  if (entry[0] === entry[3]) return false; // self-loop

  return true;
}

// ─── Helper: Detect cycle using DFS ───
function hasCycle(node, adjList, visited, stack) {
  visited.add(node);
  stack.add(node);

  const children = adjList[node] || [];
  for (const child of children) {
    if (!visited.has(child)) {
      if (hasCycle(child, adjList, visited, stack)) return true;
    } else if (stack.has(child)) {
      return true; // back edge = cycle
    }
  }

  stack.delete(node);
  return false;
}

// ─── Helper: Build nested tree object recursively ───
function buildTree(node, adjList, visited) {
  const children = adjList[node] || [];
  const result = {};
  for (const child of children) {
    if (!visited.has(child)) {
      visited.add(child);
      result[child] = buildTree(child, adjList, visited);
    }
  }
  return result;
}

// ─── Helper: Calculate depth (longest path from root to leaf) ───
function getDepth(node, adjList) {
  const children = adjList[node] || [];
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map((c) => getDepth(c, adjList)));
}

// ─── Main POST route ───
app.post("/bfhl", (req, res) => {
  const data = req.body.data || [];

  const invalid_entries = [];
  const duplicate_edges = [];
  const seenEdges = new Set();
  const validEdges = []; // only first-seen valid edges

  // Step 1: Validate and deduplicate
  for (let entry of data) {
    const trimmed = entry.trim();

    if (!isValidEntry(trimmed)) {
      invalid_entries.push(trimmed); // push original trimmed value
      continue;
    }

    if (seenEdges.has(trimmed)) {
      // It's a duplicate — push only ONCE to duplicate_edges
      if (!duplicate_edges.includes(trimmed)) {
        duplicate_edges.push(trimmed);
      }
    } else {
      seenEdges.add(trimmed);
      validEdges.push(trimmed);
    }
  }

  // Step 2: Build adjacency list + track parents
  // adjList[parent] = [children...]
  // parentOf[child] = parent (only first-seen parent wins)
  const adjList = {};
  const parentOf = {}; // to track who is a child

  for (const edge of validEdges) {
    const [parent, child] = edge.split("->");

    // Diamond case: if child already has a parent, discard this edge silently
    if (parentOf[child] !== undefined) continue;

    parentOf[child] = parent;

    if (!adjList[parent]) adjList[parent] = [];
    adjList[parent].push(child);

    // Make sure child exists in adjList too (even if no children)
    if (!adjList[child] === undefined) adjList[child] = [];
  }

  // Collect all unique nodes
  const allNodes = new Set();
  for (const edge of validEdges) {
    const [parent, child] = edge.split("->");
    allNodes.add(parent);
    allNodes.add(child);
  }

  // Step 3: Find roots — nodes that are never a child
  // Group nodes into connected components
  // A root = not in parentOf keys (never appears as child)
  const roots = [];
  for (const node of allNodes) {
    if (parentOf[node] === undefined) {
      roots.push(node);
    }
  }

  // Step 4: Find groups via BFS from each root
  // (nodes not reachable from any root = pure cycle group)
  const visited_global = new Set();

  const hierarchies = [];

  // Process trees from known roots first
  for (const root of roots.sort()) {
    // sort roots alphabetically for consistency
    if (visited_global.has(root)) continue;

    // DFS to collect all nodes in this group
    const groupNodes = new Set();
    const dfsStack = [root];
    while (dfsStack.length > 0) {
      const n = dfsStack.pop();
      if (groupNodes.has(n)) continue;
      groupNodes.add(n);
      for (const child of adjList[n] || []) {
        dfsStack.push(child);
      }
    }

    // Mark all as visited globally
    for (const n of groupNodes) visited_global.add(n);

    // Check for cycle in this group
    const vis = new Set();
    const stk = new Set();
    let cycleFound = false;
    for (const n of groupNodes) {
      if (!vis.has(n)) {
        if (hasCycle(n, adjList, vis, stk)) {
          cycleFound = true;
          break;
        }
      }
    }

    if (cycleFound) {
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      const treeVisited = new Set([root]);
      const tree = { [root]: buildTree(root, adjList, treeVisited) };
      const depth = getDepth(root, adjList);
      hierarchies.push({ root, tree, depth });
    }
  }

  // Handle pure cycles — nodes never visited (no root)
  const unvisited = [...allNodes].filter((n) => !visited_global.has(n));
  if (unvisited.length > 0) {
    // Find connected components among unvisited
    const unvisitedSet = new Set(unvisited);
    const processedInCycle = new Set();

    for (const node of [...unvisited].sort()) {
      if (processedInCycle.has(node)) continue;

      // BFS to get all nodes in this cycle group
      const group = new Set();
      const q = [node];
      while (q.length > 0) {
        const n = q.shift();
        if (group.has(n)) continue;
        group.add(n);
        for (const child of adjList[n] || []) {
          if (unvisitedSet.has(child)) q.push(child);
        }
        // also go reverse (children to parents) for full group
        for (const [p, children] of Object.entries(adjList)) {
          if (children.includes(n) && unvisitedSet.has(p)) q.push(p);
        }
      }

      for (const n of group) processedInCycle.add(n);

      // Use lexicographically smallest node as root for pure cycle
      const cycleRoot = [...group].sort()[0];
      hierarchies.push({ root: cycleRoot, tree: {}, has_cycle: true });
    }
  }

  // Step 5: Build summary
  const nonCyclicTrees = hierarchies.filter((h) => !h.has_cycle);
  const total_trees = nonCyclicTrees.length;
  const total_cycles = hierarchies.filter((h) => h.has_cycle).length;

  let largest_tree_root = "";
  let maxDepth = -1;
  for (const h of nonCyclicTrees) {
    if (
      h.depth > maxDepth ||
      (h.depth === maxDepth && h.root < largest_tree_root)
    ) {
      maxDepth = h.depth;
      largest_tree_root = h.root;
    }
  }

  // Final response
  res.json({
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL_NUMBER,
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees,
      total_cycles,
      largest_tree_root,
    },
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
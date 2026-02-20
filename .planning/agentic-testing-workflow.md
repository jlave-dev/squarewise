# Agentic UI Testing Workflow Design

## Overview

A comprehensive multi-agent workflow for discovering, diagnosing, fixing, and verifying UI issues using agent-browser, zai MCP visual tools, and Claude Code agent teams.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    TEAM LEAD (Orchestrator)                      │
│         Coordinates agents, manages state, tracks progress       │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ BROWSER TESTER│     │  UI ANALYZER  │     │  CODE FIXER   │
│               │     │               │     │               │
│ agent-browser │────▶│ zai MCP tools │────▶│ Edit/Write    │
│ screenshots   │     │ vision AI     │     │ code changes  │
└───────────────┘     └───────────────┘     └───────────────┘
        │                       │                       │
        └───────────────────────┴───────────────────────┘
                                │
                        ┌───────▼───────┐
                        │ VERIFIER LOOP │
                        │ Re-test until │
                        │ all pass      │
                        └───────────────┘
```

---

## Agent Roles

### 1. Team Lead (Orchestrator)
**Responsibilities:**
- Create and assign tasks
- Coordinate agent communication
- Track overall progress
- Handle agent failures/retries
- Determine when to exit the loop

**Tools:** TaskCreate, TaskUpdate, TaskList, SendMessage

### 2. Browser Tester
**Responsibilities:**
- Start dev server
- Navigate to application
- Execute test scenarios
- Take screenshots at each step
- Report UI state to analyzer

**Tools:** agent-browser CLI
- `agent-browser open <url>`
- `agent-browser snapshot -i -C`
- `agent-browser click @ref`
- `agent-browser fill @ref "text"`
- `agent-browser screenshot <path>`
- `agent-browser eval "js"`

### 3. UI Analyzer
**Responsibilities:**
- Analyze screenshots for usability issues
- Identify visual bugs (color, contrast, layout)
- Check accessibility (text size, touch targets)
- Generate structured issue reports

**Tools:** zai MCP
- `analyze_image` - General UI analysis
- `ui_to_artifact` - Convert to specs/descriptions
- `extract_text_from_screenshot` - OCR for text issues
- `diagnose_error_screenshot` - Error state analysis
- `ui_diff_check` - Before/after comparison

### 4. Code Fixer
**Responsibilities:**
- Receive issue reports from analyzer
- Read relevant source files
- Make targeted code fixes
- Notify when fixes are ready for re-test

**Tools:** Read, Edit, Write, Grep, Glob

---

## TDD Verification Loop

```
┌─────────────────────────────────────────────────────────────┐
│                    TDD VERIFICATION CYCLE                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐                │
│   │  RED    │───▶│  GREEN  │───▶│ VERIFY  │                │
│   │ Capture │    │  Fix    │    │ Confirm │                │
│   │  Issue  │    │  Code   │    │  Fixed  │                │
│   └─────────┘    └─────────┘    └────┬────┘                │
│        ▲                             │                      │
│        │         ┌─────────┐         │                      │
│        └─────────│  PASS?  │◀────────┘                      │
│                  └────┬────┘                                 │
│                       │                                      │
│              NO ◄─────┴─────► YES                            │
│              │                  │                            │
│              ▼                  ▼                            │
│        [Next Issue]       [Issue Resolved]                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### RED Phase (Capture Issue)
1. Browser tester takes screenshot of current state
2. UI analyzer identifies specific issue
3. Issue is documented with:
   - Description
   - Screenshot path
   - Expected vs actual behavior
   - Affected files (if known)

### GREEN Phase (Fix Code)
1. Code fixer receives structured issue report
2. Reads relevant source files
3. Makes targeted fix
4. Notifies team lead of completion

### VERIFY Phase (Confirm Fixed)
1. Browser tester re-opens page (or refreshes)
2. Takes new screenshot
3. UI analyzer compares before/after
4. If not fixed, loop back to RED with updated context

---

## Detailed Workflow

### Phase 1: Setup
```bash
# Team Lead creates team
TeamCreate(name="ui-testers", description="Testing team")

# Spawn agents
Task(subagent_type="general-purpose", name="browser-tester")
Task(subagent_type="general-purpose", name="ui-analyzer")
Task(subagent_type="general-purpose", name="code-fixer")

# Create task queue
TaskCreate(subject="Start dev server and open browser")
TaskCreate(subject="Test functionality and capture screenshots")
TaskCreate(subject="Analyze screenshots for issues")
TaskCreate(subject="Fix identified issues")
TaskCreate(subject="Re-test and verify fixes")
```

### Phase 2: Discovery
```bash
# Browser Tester
npm run dev &
agent-browser open http://localhost:5173
agent-browser wait --load networkidle

# For each UI state:
agent-browser screenshot /tmp/state-1.png
agent-browser snapshot -i -C
# Interact with UI...
agent-browser screenshot /tmp/state-2.png
```

### Phase 3: Analysis
```bash
# UI Analyzer
mcp__zai-mcp-server__analyze_image(
  image_source="/tmp/state-1.png",
  prompt="Identify usability issues: button sizes, text readability,
          color contrast, layout problems, missing feedback"
)

mcp__zai-mcp-server__ui_to_artifact(
  image_source="/tmp/state-1.png",
  output_type="description",
  prompt="Describe UI elements and any issues"
)
```

### Phase 4: Fix
```bash
# Code Fixer
Read(file_path="src/renderer/CanvasRenderer.ts")
Edit(file_path, old_string="...", new_string="...")
# Or use Write for new files
```

### Phase 5: Verify
```bash
# Browser Tester (re-test)
agent-browser open http://localhost:5173
agent-browser screenshot /tmp/state-1-fixed.png

# UI Analyzer (compare)
mcp__zai-mcp-server__ui_diff_check(
  before="/tmp/state-1.png",
  after="/tmp/state-1-fixed.png"
)
```

---

## Self-Healing Capabilities

### Visual Element Fallback
When CSS selectors fail, use visual location:

```bash
# Instead of brittle selectors
agent-browser click "@e1"

# Use semantic locators
agent-browser find text "Submit" click
agent-browser find role button click --name "Save"
```

### Adaptive Screenshots
```bash
# Wait for stability before screenshot
agent-browser wait --load networkidle
agent-browser wait 2000  # Additional buffer
agent-browser screenshot output.png
```

### Issue Deduplication
Track issues to avoid re-reporting:
```javascript
// In team state
seenIssues = new Set([
  "button-too-small-number-pad",
  "cage-colors-too-light",
  "no-selected-cell-indicator"
])
```

---

## Edge Cases & Handling

### Issue: Dev server not starting
**Solution:** Retry with exponential backoff, check port availability

### Issue: Browser automation fails
**Solution:** Use semantic locators, fallback to coordinates

### Issue: Screenshot shows wrong state
**Solution:** Add explicit waits, check for loading indicators

### Issue: Fix introduces new bug
**Solution:** Keep before/after screenshots, use ui_diff_check

### Issue: Agent goes unresponsive
**Solution:** Timeout + restart agent with context

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Issues found per session | > 3 |
| False positive rate | < 20% |
| Fix verification success | > 90% |
| Time to fix (per issue) | < 5 min |
| Agent coordination failures | < 5% |

---

## Anthropic Best Practices Compliance

Based on [Anthropic's official documentation](https://claude.ai/code) and MCP best practices:

### 1. Task Dependencies (DAG Pattern)
Tasks must use proper blocking relationships:
```
Task 1 (Setup) ──────┐
                      ├──▶ Task 3 (Analysis)
Task 2 (Discovery) ──┘
                            │
                            ▼
                      Task 4 (Fix)
                            │
                            ▼
                      Task 5 (Verify)
                            │
                            ▼
                      [Loop if not fixed]
```

### 2. Context Management
- Use `/compact` to summarize progress when context fills
- Store screenshots externally, not in context
- Use structured issue reports to avoid verbose descriptions

### 3. Token Efficiency (MCP Best Practices)
- Return semantic context, not raw data
- Clean intermediate results
- Use specific prompts for visual analysis
- Avoid duplicate information in responses

### 4. Agent Communication Pattern
```typescript
// CORRECT: Direct messaging
SendMessage({
  type: "message",
  recipient: "code-fixer",
  content: "Issue: button size 40px (expected 48px). File: main.css line 149",
  summary: "Fix button size issue"
})

// INCORRECT: Plain text output (teammates can't see it)
console.log("Please fix the button") // Teammates can't read this!
```

### 5. Proper Shutdown Handling
```typescript
// Always respond to shutdown requests
SendMessage({
  type: "shutdown_response",
  request_id: "abc-123",
  approve: true  // or false with reason
})
```

### 6. Task Lifecycle Management
```typescript
// Correct task lifecycle
TaskUpdate({ taskId: "1", status: "in_progress" })  // When starting
TaskUpdate({ taskId: "1", status: "completed" })    // When done

// Always check TaskList after completing work
TaskList() // Find next unblocked task
```

---

## Implementation Checklist

- [x] Create Claude Code skill for workflow
- [x] Define agent prompts with clear responsibilities
- [x] Create task templates with dependencies
- [x] Add screenshot naming convention
- [x] Implement issue tracking state
- [x] Add termination conditions
- [x] Add Anthropic best practices compliance
- [ ] Create automated report generation
- [ ] Add retry/timeout handling for unresponsive agents

---

## Sources

- [Anthropic Claude Code Documentation](https://claude.ai/code)
- [MCP Best Practices Guide](https://docs.anthropic.com/claude/docs/mcp)
- [Agent Teams Configuration](https://docs.anthropic.com/claude/docs/agent-teams)
- [Advanced Tool Use Patterns](https://docs.anthropic.com/claude/docs/tool-use)

---

## File Structure

```
.claude/
├── skills/
│   └── ui-test-workflow.md      # Skill definition
├── agents/
│   ├── browser-tester.md         # Agent prompt
│   ├── ui-analyzer.md            # Agent prompt
│   └── code-fixer.md             # Agent prompt
└── teams/
    └── ui-testers/               # Team config

.planning/
└── testing/
    ├── screenshots/              # Captured screenshots
    ├── issues/                   # Issue reports
    └── reports/                  # Final reports
```

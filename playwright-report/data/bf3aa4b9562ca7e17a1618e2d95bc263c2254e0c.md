# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: audit\feature-coverage.spec.ts >> Feature Coverage Audit >> judge tab: search returns CourtListener result
- Location: e2e\audit\feature-coverage.spec.ts:245:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/liman/i).first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByText(/liman/i).first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - img [ref=e7]
        - generic [ref=e12]: LEX PROTOCOL
      - navigation [ref=e13]:
        - link "Dashboard" [ref=e14] [cursor=pointer]:
          - /url: /dashboard
          - img [ref=e15]
          - generic [ref=e20]: Dashboard
        - link "Clients" [ref=e21] [cursor=pointer]:
          - /url: /clients
          - img [ref=e22]
          - generic [ref=e27]: Clients
        - link "Settings" [ref=e28] [cursor=pointer]:
          - /url: /settings
          - img [ref=e29]
          - generic [ref=e32]: Settings
        - link "Administration" [ref=e33] [cursor=pointer]:
          - /url: /administration
          - img [ref=e34]
          - generic [ref=e38]: Administration
      - button "New Matter" [ref=e40] [cursor=pointer]:
        - img [ref=e41]
        - text: New Matter
      - generic [ref=e42]:
        - generic [ref=e43]:
          - generic [ref=e44]: Matters
          - generic [ref=e45]: "1"
        - link "Coverage Test Matter — Parker Industries Active" [ref=e46] [cursor=pointer]:
          - /url: /matters/2978c7ec-cd98-4fc2-a73b-8dfa612fd2a8/overview
          - img [ref=e47]
          - generic [ref=e49]:
            - generic [ref=e50]: Coverage Test Matter — Parker Industries
            - generic [ref=e51]: Active
      - generic [ref=e52]:
        - generic [ref=e53]:
          - button "00h 00m" [ref=e54] [cursor=pointer]:
            - img [ref=e55]
            - generic [ref=e57]: 00h 00m
          - link "$0.00 / $150" [ref=e58] [cursor=pointer]:
            - /url: /admin
            - text: $0.00 / $150
        - button "armin" [ref=e61] [cursor=pointer]:
          - img [ref=e63]
          - generic [ref=e66]: armin
        - link "LexAgent v1.3.1" [ref=e67] [cursor=pointer]:
          - /url: /changelog
          - generic [ref=e68]: LexAgent
          - generic [ref=e69]: v1.3.1
        - button [ref=e70] [cursor=pointer]:
          - img [ref=e71]
    - main [ref=e74]:
      - generic [ref=e75]:
        - generic [ref=e76]:
          - generic [ref=e77]:
            - link [ref=e78] [cursor=pointer]:
              - /url: /dashboard
              - img [ref=e79]
            - generic [ref=e81]:
              - heading "Coverage Test Matter — Parker Industries" [level=1] [ref=e82]
              - generic [ref=e83]:
                - generic [ref=e84]: Parker Industries Inc.
                - generic [ref=e85]: Criminal Defense
                - generic [ref=e86]: Active
          - button "Private" [ref=e87] [cursor=pointer]:
            - img [ref=e88]
            - generic [ref=e91]: Private
        - generic [ref=e92]:
          - link "Overview" [ref=e93] [cursor=pointer]:
            - /url: /matters/2978c7ec-cd98-4fc2-a73b-8dfa612fd2a8/overview
            - img [ref=e94]
            - generic [ref=e99]: Overview
          - link "Research" [ref=e100] [cursor=pointer]:
            - /url: /matters/2978c7ec-cd98-4fc2-a73b-8dfa612fd2a8/research
            - img [ref=e101]
            - generic [ref=e104]: Research
          - link "Deep Research" [ref=e105] [cursor=pointer]:
            - /url: /matters/2978c7ec-cd98-4fc2-a73b-8dfa612fd2a8/deep-research
            - img [ref=e106]
            - generic [ref=e113]: Deep Research
          - link "Vault" [ref=e114] [cursor=pointer]:
            - /url: /matters/2978c7ec-cd98-4fc2-a73b-8dfa612fd2a8/vault
            - img [ref=e115]
            - generic [ref=e118]: Vault
          - link "Strategy" [ref=e119] [cursor=pointer]:
            - /url: /matters/2978c7ec-cd98-4fc2-a73b-8dfa612fd2a8/strategy
            - img [ref=e120]
            - generic [ref=e124]: Strategy
          - link "Judge Intel" [ref=e125] [cursor=pointer]:
            - /url: /matters/2978c7ec-cd98-4fc2-a73b-8dfa612fd2a8/judge
            - img [ref=e126]
            - generic [ref=e131]: Judge Intel
          - link "Deadlines" [ref=e133] [cursor=pointer]:
            - /url: /matters/2978c7ec-cd98-4fc2-a73b-8dfa612fd2a8/deadlines
            - img [ref=e134]
            - generic [ref=e137]: Deadlines
          - link "Timeline" [ref=e138] [cursor=pointer]:
            - /url: /matters/2978c7ec-cd98-4fc2-a73b-8dfa612fd2a8/timeline
            - img [ref=e139]
            - generic [ref=e141]: Timeline
          - link "Shield" [ref=e142] [cursor=pointer]:
            - /url: /matters/2978c7ec-cd98-4fc2-a73b-8dfa612fd2a8/citations
            - img [ref=e143]
            - generic [ref=e146]: Shield
          - link "Draft" [ref=e147] [cursor=pointer]:
            - /url: /matters/2978c7ec-cd98-4fc2-a73b-8dfa612fd2a8/draft
            - img [ref=e148]
            - generic [ref=e152]: Draft
          - link "Evidence" [ref=e153] [cursor=pointer]:
            - /url: /matters/2978c7ec-cd98-4fc2-a73b-8dfa612fd2a8/notes
            - img [ref=e154]
            - generic [ref=e156]: Evidence
          - link "Billing" [ref=e157] [cursor=pointer]:
            - /url: /matters/2978c7ec-cd98-4fc2-a73b-8dfa612fd2a8/billing
            - img [ref=e158]
            - generic [ref=e161]: Billing
          - link "Conflict" [ref=e162] [cursor=pointer]:
            - /url: /matters/2978c7ec-cd98-4fc2-a73b-8dfa612fd2a8/conflict
            - img [ref=e163]
            - generic [ref=e167]: Conflict
        - generic [ref=e169]:
          - generic [ref=e171]:
            - img [ref=e173]
            - generic [ref=e178]:
              - heading "Judge Intel" [level=2] [ref=e179]
              - paragraph [ref=e180]: Judge profile, career history, and AI-synthesized strategic brief
          - generic [ref=e181]:
            - textbox "Judge full name…" [ref=e182]: Lewis Liman
            - button "Search" [ref=e183] [cursor=pointer]:
              - img [ref=e184]
              - text: Search
          - generic [ref=e187]:
            - generic [ref=e188]:
              - heading [level=3]
              - generic [ref=e189]:
                - paragraph [ref=e190]: POSITIONS
                - generic [ref=e192]:
                  - generic [ref=e193]: —
                  - generic [ref=e194]: – present
              - button "Generate AI Intelligence Brief" [ref=e196] [cursor=pointer]:
                - img [ref=e197]
                - text: Generate AI Intelligence Brief
            - generic [ref=e199]:
              - generic [ref=e200]:
                - img [ref=e201]
                - generic [ref=e203]: FJC BIOGRAPHICAL DATA
              - generic [ref=e204]:
                - generic [ref=e205]:
                  - text: Commission Date
                  - paragraph [ref=e206]: December 31, 2019
                - generic [ref=e207]:
                  - text: Court
                  - paragraph [ref=e208]:
                    - text: U.S. District Court for the Southern District of New York
                    - generic [ref=e209]: · U.S. District Court
                - generic [ref=e210]:
                  - text: Background
                  - paragraph [ref=e211]: Male · b. 1960
            - generic [ref=e212]:
              - heading "Recent Opinions (1)" [level=4] [ref=e213]
              - generic [ref=e215]:
                - generic [ref=e216]:
                  - paragraph [ref=e217]: Lightning Lube, Inc. v. Witco Corp.
                  - generic [ref=e218]:
                    - generic [ref=e219]: Court of Appeals for the Third Circuit
                    - generic [ref=e220]: 9/10/1993
                    - generic [ref=e221]: 4 F.3d 1153
                - link [ref=e222] [cursor=pointer]:
                  - /url: https://www.courtlistener.com/opinion/7026532/lightning-lube-inc-v-witco-corp/
                  - img [ref=e223]
    - link "v1.3.1" [ref=e227] [cursor=pointer]:
      - /url: /changelog
  - alert [ref=e228]
```

# Test source

```ts
  158 |     await page.goto(`${BASE}/admin`);
  159 |     const inspectorTab = page.getByRole("button", { name: /ares inspector|inspector/i });
  160 |     await expect(inspectorTab).toBeVisible({ timeout: 10_000 });
  161 |     await inspectorTab.click();
  162 | 
  163 |     // System prompt preview must have content
  164 |     const promptPreview = page.getByText(/ARES|elite AI legal/i).first();
  165 |     await expect(promptPreview).toBeVisible({ timeout: 10_000 });
  166 | 
  167 |     // Token count must be > 0
  168 |     const tokenCount = page.getByText(/\d+\s*(chars|tokens|tok)/i).first();
  169 |     await expect(tokenCount).toBeVisible({ timeout: 10_000 });
  170 |     console.log("✓ ARES Inspector: system prompt + token count visible");
  171 |   });
  172 | 
  173 |   test("admin: waterfall stats panel shows provider rows", async () => {
  174 |     await page.goto(`${BASE}/admin`);
  175 |     const telemetryTab = page.getByRole("button", { name: /telemetry/i });
  176 |     await expect(telemetryTab).toBeVisible({ timeout: 10_000 });
  177 |     await telemetryTab.click();
  178 | 
  179 |     // Waterfall stats table — look for provider names
  180 |     const statsPanel = page.getByText(/groq|cerebras|gemini/i).first();
  181 |     await expect(statsPanel).toBeVisible({ timeout: 15_000 });
  182 |     console.log("✓ Waterfall stats: provider rows visible");
  183 |   });
  184 | 
  185 |   // ── Vault: Document Lifecycle ─────────────────────────────────────────────────
  186 | 
  187 |   test("vault: upload a document", async () => {
  188 |     await page.goto(`${BASE}/matters/${matterId}/vault`);
  189 |     await page.waitForLoadState("networkidle");
  190 | 
  191 |     // Open add document dialog/form
  192 |     const addBtn = page.getByRole("button", { name: /add document|upload/i }).first();
  193 |     await expect(addBtn).toBeVisible({ timeout: 10_000 });
  194 |     await addBtn.click();
  195 | 
  196 |     // Fill title
  197 |     const titleInput = page.getByPlaceholder(/document title|title/i).first();
  198 |     await expect(titleInput).toBeVisible({ timeout: 5_000 });
  199 |     await titleInput.fill("Coverage Test — Motion Brief");
  200 | 
  201 |     // Select doc type if dropdown present
  202 |     const typeSelect = page.locator("select").filter({ hasText: /motion|brief|type/i }).first();
  203 |     if (await typeSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
  204 |       await typeSelect.selectOption("Brief");
  205 |     }
  206 | 
  207 |     // Upload via file input
  208 |     const fileInput = page.locator("input[type='file']");
  209 |     if (await fileInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
  210 |       await fileInput.setInputFiles({
  211 |         name: "test-brief.pdf",
  212 |         mimeType: "application/pdf",
  213 |         buffer: TINY_PDF,
  214 |       });
  215 |     } else {
  216 |       // No file input — URL mode
  217 |       const urlInput = page.getByPlaceholder(/https|url/i).first();
  218 |       if (await urlInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
  219 |         await urlInput.fill("https://example.com/test.pdf");
  220 |       }
  221 |     }
  222 | 
  223 |     // Submit
  224 |     const saveBtn = page.getByRole("button", { name: /save|add|upload/i }).last();
  225 |     await saveBtn.click();
  226 |     await page.waitForTimeout(3_000);
  227 | 
  228 |     // Document should appear in list
  229 |     const docEntry = page.getByText(/coverage test.*motion brief/i).first();
  230 |     await expect(docEntry).toBeVisible({ timeout: 10_000 });
  231 |     console.log("✓ Vault: document uploaded and visible in list");
  232 |   });
  233 | 
  234 |   test("vault: document persists on reload", async () => {
  235 |     await page.goto(`${BASE}/matters/${matterId}/vault`);
  236 |     await page.waitForLoadState("networkidle");
  237 | 
  238 |     const docEntry = page.getByText(/coverage test.*motion brief/i).first();
  239 |     await expect(docEntry).toBeVisible({ timeout: 10_000 });
  240 |     console.log("✓ Vault: document persists after reload");
  241 |   });
  242 | 
  243 |   // ── Judge Tab: F3 FJC Panel ───────────────────────────────────────────────────
  244 | 
  245 |   test("judge tab: search returns CourtListener result", async () => {
  246 |     await page.goto(`${BASE}/matters/${matterId}/judge`);
  247 |     await page.waitForLoadState("networkidle");
  248 | 
  249 |     const judgeInput = page.getByPlaceholder(/judge.*name|full name/i);
  250 |     await expect(judgeInput).toBeVisible({ timeout: 10_000 });
  251 |     await judgeInput.fill("Lewis Liman");
  252 | 
  253 |     await page.getByRole("button", { name: /search/i }).click();
  254 |     await page.waitForTimeout(6_000);
  255 | 
  256 |     // CourtListener result card
  257 |     const result = page.getByText(/liman/i).first();
> 258 |     await expect(result).toBeVisible({ timeout: 15_000 });
      |                          ^ Error: expect(locator).toBeVisible() failed
  259 |     console.log("✓ Judge tab: CourtListener result returned");
  260 |   });
  261 | 
  262 |   test("judge tab: FJC panel renders biographical data", async () => {
  263 |     await page.goto(`${BASE}/matters/${matterId}/judge`);
  264 |     await page.waitForLoadState("networkidle");
  265 | 
  266 |     const judgeInput = page.getByPlaceholder(/judge.*name|full name/i);
  267 |     await expect(judgeInput).toBeVisible({ timeout: 10_000 });
  268 |     await judgeInput.fill("Lewis Liman");
  269 |     await page.getByRole("button", { name: /search/i }).click();
  270 |     await page.waitForTimeout(6_000);
  271 | 
  272 |     // FJC panel — look for appointing president or law school data
  273 |     const fjcPanel = page.getByText(/appointing president|law school|commission/i).first();
  274 |     await expect(fjcPanel).toBeVisible({ timeout: 15_000 });
  275 |     console.log("✓ Judge tab: FJC biographical panel visible");
  276 |   });
  277 | 
  278 |   // ── Deep Research: EDGAR Tab ──────────────────────────────────────────────────
  279 | 
  280 |   test("deep-research: EDGAR tab returns filings", async () => {
  281 |     await page.goto(`${BASE}/matters/${matterId}/deep-research`);
  282 |     await page.waitForLoadState("networkidle");
  283 | 
  284 |     // Switch to EDGAR tab
  285 |     const edgarTab = page.getByRole("button", { name: /edgar|sec/i });
  286 |     await expect(edgarTab).toBeVisible({ timeout: 10_000 });
  287 |     await edgarTab.click();
  288 | 
  289 |     // Search
  290 |     const searchInput = page.getByPlaceholder(/search|company|query/i).first();
  291 |     await expect(searchInput).toBeVisible({ timeout: 5_000 });
  292 |     await searchInput.fill("Apple");
  293 | 
  294 |     const searchBtn = page.getByRole("button", { name: /search|go/i }).first();
  295 |     await searchBtn.click();
  296 | 
  297 |     // At least one filing result
  298 |     const filing = page.getByText(/10-K|10-Q|8-K|annual|filing/i).first();
  299 |     await expect(filing).toBeVisible({ timeout: 20_000 });
  300 |     console.log("✓ EDGAR tab: filings returned");
  301 |   });
  302 | 
  303 |   // ── LexMemory: Context Injection ─────────────────────────────────────────────
  304 | 
  305 |   test("research tab: submits query and returns output", async () => {
  306 |     await page.goto(`${BASE}/matters/${matterId}/research`);
  307 |     await page.waitForLoadState("networkidle");
  308 | 
  309 |     const textarea = page.locator("textarea").first();
  310 |     await expect(textarea).toBeVisible({ timeout: 10_000 });
  311 |     await textarea.fill("What is the materiality standard for wire fraud in the Second Circuit?");
  312 | 
  313 |     const submitBtn = page.getByRole("button", { name: /research|send/i })
  314 |       .or(page.locator("button[type='submit']"))
  315 |       .first();
  316 |     await submitBtn.click();
  317 | 
  318 |     // Wait for AI output
  319 |     const prose = page.locator(".prose").last();
  320 |     const pre   = page.locator("pre").last();
  321 |     const output = prose.or(pre);
  322 |     await expect(output).toBeVisible({ timeout: 90_000 });
  323 | 
  324 |     const text = await output.innerText();
  325 |     expect(text.length).toBeGreaterThan(20);
  326 |     console.log("✓ Research: AI output returned, length:", text.length);
  327 |   });
  328 | 
  329 |   test("admin: ARES Inspector shows recent AI call after research", async () => {
  330 |     await page.goto(`${BASE}/admin`);
  331 |     const inspectorTab = page.getByRole("button", { name: /ares inspector|inspector/i });
  332 |     await expect(inspectorTab).toBeVisible({ timeout: 10_000 });
  333 |     await inspectorTab.click();
  334 | 
  335 |     // Last 20 calls table should have at least one row (the research we just ran)
  336 |     const callRow = page.locator("table tr").filter({ hasText: /research|groq|anthropic|gemini/i }).first();
  337 |     await expect(callRow).toBeVisible({ timeout: 15_000 });
  338 |     console.log("✓ ARES Inspector: recent AI call logged");
  339 |   });
  340 | 
  341 |   // ── Live Feed Tab ─────────────────────────────────────────────────────────────
  342 | 
  343 |   test("admin: Live Feed tab renders and has rows", async () => {
  344 |     await page.goto(`${BASE}/admin`);
  345 |     const liveFeedTab = page.getByRole("button", { name: /live feed/i });
  346 |     await expect(liveFeedTab).toBeVisible({ timeout: 10_000 });
  347 |     await liveFeedTab.click();
  348 | 
  349 |     // At minimum the feed container must render
  350 |     const feed = page.locator("[class*='feed'], [class*='live'], table").first();
  351 |     await expect(feed).toBeVisible({ timeout: 10_000 });
  352 |     console.log("✓ Live Feed tab: container rendered");
  353 |   });
  354 | });
  355 | 
```
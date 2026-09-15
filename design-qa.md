**Design QA**

- Source visual truth: user supplied `1-照片-1.jpg` (592 x 1280 px), with the marked top area as the target position.
- Implementation captures: `_review-shots/practice-layout-implementation.png`, `_review-shots/wrong-layout-implementation.png`, `_review-shots/me-layout-implementation.png`.
- Combined comparison: `_review-shots/layout-qa-composite.jpg`.
- Viewport/state: WeChat DevTools phone simulator, practice loaded with recommendations, wrong page loaded with records, profile loaded.
- Capture normalization: DevTools phone regions were captured at 234 x 513 px and scaled to 592 x 1280 px only for the combined visual comparison. The source is 592 x 1280 px.

**Full-view comparison evidence**

The practice heading now occupies the marked top area, leaves the right side to a larger character, and removes the unused vertical gap. The wrong page follows the same top composition. The profile heading is raised slightly while its card rhythm stays intact.

**Focused region comparison evidence**

The top regions were checked for status-bar clearance, menu-capsule clearance, title wrapping, copy spacing, and character balance. No overlap or truncation is visible.

**Required fidelity surfaces**

- Fonts and typography: existing display and body fonts, sizes, weights, and line heights are preserved; headings do not wrap.
- Spacing and layout rhythm: the requested blank area is removed; page sections retain their existing internal spacing.
- Colors and visual tokens: unchanged from the accepted app design system.
- Image quality and asset fidelity: existing accepted character components are reused without scaling artifacts or asset substitutions.
- Copy and content: unchanged.

**Findings**

No actionable P0, P1, or P2 differences remain for the requested layout changes.

**Comparison history**

- Earlier finding: practice and wrong page headings started below a large unused navigation-height area; characters were visually too small.
- Fix: align the left content with the home page's usable capsule row and enlarge the right character slots; raise the profile heading by a smaller amount.
- Post-fix evidence: the three implementation captures and the combined comparison show safe clearance, intentional line breaks, concise supporting copy, and balanced top regions.
- Second iteration: practice supporting copy was shortened and split into two readable lines; its count hint and the wrong-page subtitle were shortened. The final captures show no clipping or crowded single-line text.
- Third iteration: both top regions were lowered to the capsule center line, while the right-side characters were moved down independently to clear the ellipsis and close controls. Final captures: `_review-shots/practice-layout-aligned.png` and `_review-shots/wrong-layout-aligned.png`.

**Implementation Checklist**

- Practice top area moved and rebalanced: passed.
- Wrong page top area matched to the same rule: passed.
- Profile heading slightly raised: passed.
- Existing content, motion, and copy preserved: passed.

final result: passed

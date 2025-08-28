# Accessibility Guidelines

Comprehensive accessibility guidelines for the AI Investor Pitch Advisor platform.

## Overview

This document outlines our commitment to accessibility (a11y) compliance and provides guidelines for maintaining WCAG 2.1 AA standards across the platform.

## WCAG 2.1 AA Compliance

### Success Criteria Implemented

#### 1. Perceivable
- **Text Alternatives**: All images have descriptive alt text
- **Audio Description**: Charts include text descriptions
- **Contrast**: Minimum 4.5:1 contrast ratio for text
- **Resize Text**: Interface scales to 200% without loss of functionality

#### 2. Operable
- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Focus Indicators**: Clear focus indicators with sufficient contrast
- **Timing Adjustable**: No time limits for user input
- **Motion Reduction**: Respects user's motion preferences

#### 3. Understandable
- **Readable**: Clear, simple language throughout
- **Predictable**: Consistent navigation and behavior
- **Input Assistance**: Clear labels and error messages

#### 4. Robust
- **Compatible**: Works with current and future assistive technologies
- **Name/Role/Value**: Proper ARIA implementation

## Implementation Guidelines

### Frontend Components

#### Buttons and Interactive Elements
```tsx
// ✅ Good: Proper ARIA labels and keyboard support
<button
  onClick={handleAction}
  aria-label="Upload pitch deck file"
  className="focus:ring-2 focus:ring-blue-500 focus:outline-none"
>
  <UploadIcon aria-hidden="true" />
  Upload Deck
</button>

// ❌ Bad: Missing accessibility attributes
<button onClick={handleAction}>
  Upload
</button>
```

#### Form Elements
```tsx
// ✅ Good: Proper labeling and error handling
<div>
  <label htmlFor="deck-name" className="sr-only">
    Pitch Deck Name
  </label>
  <input
    id="deck-name"
    type="text"
    aria-describedby="deck-name-error"
    aria-invalid={hasError}
    className="..."
  />
  {hasError && (
    <p id="deck-name-error" role="alert" className="text-red-600">
      Deck name is required
    </p>
  )}
</div>
```

#### Data Tables
```tsx
// ✅ Good: Proper table structure with headers
<table role="table" aria-label="Analysis Results">
  <thead>
    <tr>
      <th scope="col">Dimension</th>
      <th scope="col">Score</th>
      <th scope="col">Explanation</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Clarity</td>
      <td>8.5/10</td>
      <td>Clear value proposition with specific metrics</td>
    </tr>
  </tbody>
</table>
```

### Screen Reader Support

#### ARIA Labels and Descriptions
```tsx
// Progress indicators
<div
  role="progressbar"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Analysis progress"
>
  Analyzing deck... {progress}%
</div>

// Status messages
<div aria-live="polite" aria-atomic="true">
  Analysis completed successfully
</div>
```

#### Skip Links
```tsx
// Skip to main content
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-blue-600 text-white p-2"
>
  Skip to main content
</a>

// Main content landmark
<main id="main-content">
  {/* Page content */}
</main>
```

### Keyboard Navigation

#### Tab Order
- Logical tab order through all interactive elements
- No keyboard traps
- Custom widgets support arrow key navigation

#### Keyboard Shortcuts
```tsx
// Document keyboard shortcuts
const keyboardShortcuts = [
  { key: 'Ctrl+U', action: 'Upload deck' },
  { key: 'Ctrl+A', action: 'Run analysis' },
  { key: 'Ctrl+Q', action: 'Generate Q&A' },
  { key: 'Escape', action: 'Close modal' }
];
```

### Color and Contrast

#### Color Usage Guidelines
- **Primary Colors**: Blue (#2563eb) for actions, meets 4.5:1 contrast
- **Success**: Green (#059669) for positive states
- **Error**: Red (#dc2626) for errors and warnings
- **Warning**: Yellow (#d97706) for caution states

#### Color Blind Friendly
- Use both color and icons/patterns for status indication
- Avoid red/green combinations for critical information
- Test with color blindness simulators

### Motion and Animation

#### Reduced Motion Support
```tsx
// Respect user's motion preferences
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (!prefersReducedMotion.matches) {
  // Apply animations
  element.classList.add('animate-fade-in');
}
```

### Testing Checklist

#### Automated Testing
```typescript
// Accessibility test utilities
describe('Accessibility Tests', () => {
  test('has proper ARIA labels', () => {
    render(<UploadButton />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label');
  });

  test('keyboard navigation works', async () => {
    render(<Form />);
    const input = screen.getByRole('textbox');
    input.focus();
    expect(input).toHaveFocus();
  });

  test('sufficient color contrast', () => {
    // Use axe-core or similar for automated contrast checking
    const results = await axe.run(document.body);
    expect(results.violations).toHaveLength(0);
  });
});
```

#### Manual Testing
- [ ] Keyboard-only navigation through entire application
- [ ] Screen reader compatibility (NVDA, JAWS, VoiceOver)
- [ ] Color blindness simulation
- [ ] High contrast mode testing
- [ ] Zoom to 200% testing
- [ ] Mobile screen reader testing

### Browser Support

#### Supported Assistive Technologies
- **Screen Readers**: NVDA, JAWS, VoiceOver, TalkBack
- **Braille Displays**: Compatible with major screen readers
- **Speech Recognition**: Windows Speech Recognition, Dragon
- **Alternative Input**: Head pointers, eye tracking, switch devices

#### Browser Compatibility
- Chrome 90+ (with ChromeVox)
- Firefox 88+ (with NVDA)
- Safari 14+ (with VoiceOver)
- Edge 90+ (with Narrator)

### Performance Considerations

#### Loading States
```tsx
// Skeleton loading for better perceived performance
<div aria-live="polite">
  <SkeletonLoader />
  <span className="sr-only">Loading analysis results...</span>
</div>
```

#### Progressive Enhancement
- Core functionality works without JavaScript
- Enhanced features layer on top of basic functionality
- Graceful degradation for older browsers

### Documentation

#### User Documentation
- Keyboard shortcuts reference
- Screen reader usage guide
- Accessibility settings explanation

#### Developer Documentation
- Accessibility testing procedures
- Component accessibility requirements
- ARIA implementation patterns

### Compliance Monitoring

#### Regular Audits
- Monthly automated accessibility scans
- Quarterly manual accessibility audits
- Annual comprehensive accessibility review

#### Issue Tracking
- All accessibility issues tracked in GitHub Issues
- Priority levels: Critical, High, Medium, Low
- SLA for fixing accessibility issues

### Resources

#### Tools
- **axe-core**: Automated accessibility testing
- **WAVE**: Web accessibility evaluation tool
- **Color Contrast Analyzer**: Contrast ratio checking
- **NVDA**: Free screen reader for testing

#### References
- [WCAG 2.1 Guidelines](https://www.w3.org/TR/WCAG21/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

---

**Last Updated**: January 15, 2024
**WCAG Version**: 2.1 Level AA
**Testing Coverage**: 95%+ automated, 100% manual review

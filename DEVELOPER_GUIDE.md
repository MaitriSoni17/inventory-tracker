# Quick Reference: Mobile Responsive Development Guide

## Responsive Breakpoints (Copy & Paste)

```css
/* Mobile First Approach */

/* Extra Small (< 576px) */
.element {
  font-size: 0.875rem;
  padding: 1rem;
}

/* Small (576px and up) */
@media (min-width: 576px) {
  .element {
    font-size: 1rem;
    padding: 1.25rem;
  }
}

/* Medium (768px and up) - Also when sidebar disappears */
@media (min-width: 768px) {
  .element {
    font-size: 1.125rem;
    padding: 1.5rem;
  }
}

/* Large (1200px and up) */
@media (min-width: 1200px) {
  .element {
    font-size: 1.25rem;
    padding: 2rem;
  }
}

/* Extra Large (1440px and up) */
@media (min-width: 1440px) {
  .element {
    font-size: 1.5rem;
    padding: 2.5rem;
  }
}
```

## Common Responsive Patterns

### Fluid Typography (No Media Queries Needed)
```css
/* Instead of fixed sizes, use clamp() */
h1 {
  font-size: clamp(1.5rem, 5vw, 3rem);
  /* min, preferred (% of viewport), max */
}
```

### Responsive Grid
```css
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(1rem, 3vw, 2rem);
}

@media (min-width: 576px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
```

### Responsive Images
```css
img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* For fixed aspect ratio */
.image-container {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

### Touch-Friendly Buttons
```css
button {
  min-height: 44px;
  min-width: 44px;
  padding: clamp(0.5rem, 2vw, 0.75rem) 
           clamp(1rem, 3vw, 1.5rem);
  font-size: clamp(0.875rem, 2vw, 1rem);
}

/* Ensure adequate touch spacing */
button + button {
  margin-left: 0.5rem;
}
```

### Responsive Tables
```css
/* Show/hide columns based on screen size */
@media (max-width: 767px) {
  .table thead {
    display: none;
  }

  .table tbody tr {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.5rem;
    padding: 1rem;
    border: 1px solid #dee2e6;
    margin-bottom: 1rem;
  }

  .table tbody td::before {
    content: attr(data-label);
    font-weight: 600;
    min-width: 100px;
  }
}
```

### Responsive Forms
```css
/* Mobile First */
input, select, textarea {
  font-size: 16px; /* Prevents iOS zoom */
  width: 100%;
  padding: clamp(0.5rem, 2vw, 0.75rem);
  margin-bottom: 1rem;
}

/* Form group layout */
.form-group {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 576px) {
  .form-group {
    grid-template-columns: 1fr 1fr;
  }
}
```

## Mobile Optimization Checklist

### For Every New Component:
- [ ] Use `clamp()` for font-sizes (no hard sizes)
- [ ] Use CSS Grid/Flexbox (no floats)
- [ ] Test on 375px width (mobile)
- [ ] Ensure 44px minimum touch targets
- [ ] Add media queries for breakpoints (576px, 768px, 1200px)
- [ ] Support dark mode (`prefers-color-scheme: dark`)
- [ ] Test with keyboard navigation
- [ ] Use semantic HTML

### Accessibility Must-Haves:
```css
/* Minimum touch target */
min-height: 44px;

/* Focus state always visible */
:focus-visible {
  outline: 2px solid #0d6efd;
  outline-offset: 2px;
}

/* Respect motion preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .element {
    background-color: #2d2d2d;
    color: #e9ecef;
  }
}
```

## CSS Variables Available

```css
:root {
  /* Colors */
  --primary-color: #7B3EBC;
  --primary-light: #9B66D6;
  --primary-dark: #5d2595;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
  --success-color: #28a745;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.15);
  
  /* Transitions */
  --transition: all 0.3s ease;
}
```

Usage: `color: var(--primary-color);`

## React Component Mobile Pattern

```jsx
import { useState } from 'react';

function MyComponent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Close on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);
  
  // Close on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);
  
  return (
    <div>
      <button onClick={() => setSidebarOpen(!sidebarOpen)}>
        Menu
      </button>
      <nav className={`sidebar ${sidebarOpen ? 'show' : ''}`}>
        {/* Navigation items */}
      </nav>
    </div>
  );
}
```

## Testing on Mobile

### Using Chrome DevTools
```
1. Press F12 or Ctrl+Shift+I
2. Click device toolbar icon (Ctrl+Shift+M)
3. Select device from dropdown
4. Test interactions
5. Check at different orientations
```

### Using Real Device
```
1. Get your computer IP: ipconfig (Windows) or ifconfig (Mac)
2. Start dev server: npm start
3. On phone, go to: http://YOUR_IP:3000
4. Test touch interactions
5. Check in landscape orientation
6. Test on actual network (not localhost)
```

## Common Pitfalls to Avoid

❌ **DON'T:**
- Use fixed pixel sizes (`width: 500px`)
- Make touch targets smaller than 44px
- Use hover-only interactions
- Set `font-size: 14px` on inputs (prevents zoom)
- Use hard breakpoints (use clamp instead)
- Ignore dark mode
- Use `position: fixed` without testing
- Assume bootstrap grid is enough

✅ **DO:**
- Use `max-width`, percentages, clamp()
- Make all buttons/links 44px+
- Provide touch-friendly alternatives
- Set input `font-size: 16px` on mobile
- Use clamp() for responsive sizing
- Always support dark mode
- Test on real mobile devices
- Combine Bootstrap with custom CSS

## Performance Tips

### CSS Optimization
```css
/* Good: Uses GPU acceleration */
.element {
  transform: translateX(0);
  transition: transform 0.3s ease;
}

/* Bad: Causes repaints */
.element {
  left: 0;
  transition: left 0.3s ease;
}
```

### Smooth Scrolling on Mobile
```css
.scrollable {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
```

### Avoid Layout Shift
```css
/* Reserve space before content loads */
.image-wrapper {
  aspect-ratio: 16 / 9;
}

/* Use clamp for smooth sizing transitions */
padding: clamp(0.5rem, 2vw, 1rem);
```

## Need Help?

### Check These Files
- `responsive.css` - Global responsive framework
- `App.css` - Component styles
- `MOBILE_RESPONSIVE_GUIDE.md` - Full documentation
- `TESTING_CHECKLIST.md` - Testing procedures

### Quick Debugging
1. **Element too small?** → Check min-height/min-width (should be 44px+)
2. **Text too small?** → Check font-size uses clamp()
3. **Doesn't work on mobile?** → Test at 375px width in DevTools
4. **Dark mode broken?** → Add `@media (prefers-color-scheme: dark)` rule
5. **Touch interaction failing?** → Ensure 44px+ target size

## Deploy Checklist

Before deploying:
- [ ] Tested on 375px (mobile)
- [ ] Tested on 1920px (desktop)
- [ ] All buttons 44px+
- [ ] Dark mode works
- [ ] Inputs are 16px font-size
- [ ] No console errors
- [ ] Images responsive
- [ ] Tables scrollable on mobile
- [ ] Navigation works on mobile
- [ ] Accessibility test passed

---

*Last Updated: 2024*
*For more information, see MOBILE_RESPONSIVE_GUIDE.md*

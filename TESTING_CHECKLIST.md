# Mobile Responsive Testing Checklist

## General Responsive Design Tests

### Screen Size Tests
- [ ] **Extra Small (375px - iPhone SE)**
  - All content visible without horizontal scroll
  - Navigation works with hamburger menu
  - Forms are readable and touchable

- [ ] **Small (414px - iPhone 12/13)**
  - Text is readable without magnification
  - Buttons are easily tappable (44px+)
  - Images scale appropriately

- [ ] **Tablet (768px - iPad)**
  - Two-column layouts work
  - Sidebar visible on desktop view
  - All features accessible

- [ ] **Large (1024px - iPad Pro)**
  - Full desktop layout visible
  - Charts display properly
  - All navigation accessible

- [ ] **Desktop (1920px+)**
  - Full experience visible
  - Multi-column layouts work
  - No horizontal scroll needed

## Navigation & Layout Tests

### Sidebar Navigation
- [ ] Hamburger menu visible on mobile (<768px)
- [ ] Hamburger menu hidden on desktop (>=768px)
- [ ] Clicking hamburger toggles sidebar
- [ ] Sidebar slides in smoothly from left
- [ ] Dark overlay appears when sidebar open
- [ ] Clicking overlay closes sidebar
- [ ] Pressing Escape closes sidebar
- [ ] Sidebar auto-closes when navigation link clicked
- [ ] Sidebar auto-closes when viewport expands past 768px
- [ ] Active navigation item highlighted
- [ ] Icons display correctly
- [ ] Text not cut off in menu items

### Header/Navbar
- [ ] Title visible on mobile
- [ ] User menu icon accessible on mobile
- [ ] Notification bell accessible on mobile
- [ ] No overflow on small screens
- [ ] Proper spacing on all sizes
- [ ] Buttons are min 44px height

## Page-Specific Tests

### Login/Registration Pages
- [ ] Form centered on screen
- [ ] Input fields full width on mobile
- [ ] Input font-size is 16px (no iOS zoom)
- [ ] Form card doesn't overflow
- [ ] Buttons are full width on mobile
- [ ] Error messages visible and readable
- [ ] Links are touchable (44px+)
- [ ] Password input shows toggle on mobile

### Dashboard
- [ ] Metric cards stack vertically on mobile
- [ ] Metric cards grid responsively (2 cols on tablet, 3+ on desktop)
- [ ] Chart height responsive using aspect-ratio
- [ ] Chart labels readable on mobile
- [ ] Recent orders table scrollable on mobile
- [ ] No data cut off in tables
- [ ] Action buttons accessible on mobile

### Products Page
- [ ] Product table converts to card list on mobile
- [ ] Search bar spans full width on mobile
- [ ] Filter controls stack on mobile
- [ ] Product images display correctly
- [ ] Add Product button accessible on mobile
- [ ] Edit/Delete icons accessible on mobile
- [ ] Pagination buttons centered on mobile
- [ ] Horizontal scroll works for wide content

### Employees Page
- [ ] Metric cards responsive
- [ ] Employee table converts to cards on mobile
- [ ] Profile images scale correctly
- [ ] Action buttons (Edit/Delete) accessible
- [ ] Add Employee button visible on mobile
- [ ] Search functionality works on mobile
- [ ] Status badges visible and readable

### Categories Page
- [ ] Category cards grid responsive
- [ ] Card images don't distort
- [ ] Category names readable
- [ ] Edit/Delete icons accessible
- [ ] Add Category button visible
- [ ] Cards have proper spacing on all sizes

### Notifications
- [ ] Notification list responsive
- [ ] Notification items readable on mobile
- [ ] Timestamps display properly
- [ ] Action buttons accessible
- [ ] Notification dropdown doesn't overflow screen
- [ ] Mark as read buttons work on mobile

## Form & Input Tests

### Input Fields
- [ ] Text inputs have 16px font-size
- [ ] Input height is min 44px
- [ ] Sufficient padding around inputs
- [ ] Focus state visible on mobile
- [ ] Keyboard appears correctly (iOS/Android)
- [ ] No horizontal scroll when typing
- [ ] Placeholders are readable

### Buttons & Controls
- [ ] All buttons min 44px height
- [ ] Buttons not cramped together
- [ ] Sufficient spacing between buttons
- [ ] Hover states work on touch devices
- [ ] No hover-only interactions
- [ ] Buttons responsive sizing
- [ ] Color buttons visible on mobile

### Dropdowns & Selects
- [ ] Dropdown arrows visible
- [ ] Dropdown options readable
- [ ] Select controls 44px+ height
- [ ] Dropdown doesn't overflow screen
- [ ] Mobile keyboard appears for text inputs
- [ ] Options scrollable if many items

## Visual & Layout Tests

### Typography
- [ ] Headings readable on mobile (h1-h6)
- [ ] Body text readable (not too small)
- [ ] No text overlapping other elements
- [ ] Line-height adequate for reading
- [ ] Links understandable (not confused with text)
- [ ] No text cutoff at screen edges

### Images & Media
- [ ] Images scale properly on all sizes
- [ ] No stretched or distorted images
- [ ] Images load correctly
- [ ] Aspect ratio maintained
- [ ] No image overflow on mobile
- [ ] Icons render correctly on all sizes

### Spacing & Layout
- [ ] Proper margins on mobile
- [ ] Proper padding inside elements
- [ ] No cramped content on mobile
- [ ] Adequate whitespace
- [ ] Elements aligned properly
- [ ] No content hidden behind headers

### Colors & Contrast
- [ ] Text has sufficient contrast
- [ ] Purple theme colors work on mobile
- [ ] Focus states visible
- [ ] Badges and labels readable
- [ ] Status colors distinguish clearly
- [ ] Links visible and distinguishable

## Dark Mode Tests (if enabled)

### Dark Mode Visibility
- [ ] Switch to dark mode in system preferences
- [ ] All text readable in dark mode
- [ ] Sufficient contrast maintained
- [ ] Background colors appropriate
- [ ] Icons/images visible in dark mode
- [ ] Form inputs readable in dark mode
- [ ] Links visible in dark mode
- [ ] Badges readable in dark mode

## Accessibility Tests

### Touch Interactions
- [ ] All interactive elements 44px+ height
- [ ] Tap targets not too close together
- [ ] No accidental touches trigger actions
- [ ] Double-tap zoom works as expected
- [ ] Pinch zoom works on images
- [ ] Touch scrolling smooth and responsive

### Keyboard Navigation
- [ ] Tab key navigates all interactive elements
- [ ] Tab order logical on mobile
- [ ] Escape key closes modals/dropdowns
- [ ] Enter key activates buttons
- [ ] Keyboard doesn't obscure content
- [ ] Focus indicator visible

### Screen Readers (Mobile)
- [ ] Headings properly marked
- [ ] Forms labeled correctly
- [ ] Buttons have meaningful labels
- [ ] Image alt text present
- [ ] Links descriptive
- [ ] Navigation labeled

## Performance Tests

### Load Time
- [ ] Page loads quickly on mobile network
- [ ] Images load progressively
- [ ] No long loading screens
- [ ] Animations smooth (no jank)
- [ ] Scrolling smooth on mobile

### Animations
- [ ] Sidebar slide animation smooth
- [ ] No stuttering or delays
- [ ] Hover animations don't slow page
- [ ] Transitions feel natural
- [ ] Performance good on older devices

## Device-Specific Tests

### iOS/Safari
- [ ] No iOS zoom on input focus
- [ ] Status bar doesn't overlap content
- [ ] Safe area respected (notch/home indicator)
- [ ] Keyboard behavior normal
- [ ] Pull-to-refresh doesn't conflict
- [ ] Links open in-app or new tab correctly

### Android/Chrome
- [ ] Back button navigation works
- [ ] System nav bar doesn't overlap
- [ ] Density-specific rendering correct
- [ ] Hardware back button behavior
- [ ] Always-on display compatibility
- [ ] Gesture navigation compatible

## Orientation Tests

### Portrait Orientation
- [ ] All content visible
- [ ] No horizontal scroll
- [ ] Sidebar toggle works
- [ ] Forms readable
- [ ] Tables accessible

### Landscape Orientation
- [ ] Layout adjusts properly
- [ ] Keyboard doesn't obscure much
- [ ] Content not cramped horizontally
- [ ] Navigation still accessible
- [ ] No element overlap

## Browser Compatibility Tests

### iOS Safari
- [ ] Latest version tested
- [ ] Previous version tested
- [ ] No layout breaks
- [ ] All features work

### Chrome (Android)
- [ ] Latest version tested
- [ ] Previous version tested
- [ ] No layout breaks
- [ ] All features work

### Firefox (Mobile)
- [ ] Latest version tested
- [ ] Layout responsive
- [ ] Forms work
- [ ] Navigation works

## Edge Cases & Error States

### Error Handling
- [ ] Error messages visible on mobile
- [ ] Error states don't break layout
- [ ] Validation messages readable
- [ ] Success messages visible

### Loading States
- [ ] Loading indicators visible
- [ ] No content shifts while loading
- [ ] Animations smooth
- [ ] User knows page is working

### Extreme Cases
- [ ] Very long text doesn't break layout
- [ ] Very long lists paginate/scroll
- [ ] Many notifications display properly
- [ ] Wide tables scroll horizontally
- [ ] Empty states have proper messaging

## Final Checklist

- [ ] All tests completed
- [ ] No critical issues found
- [ ] Minor issues documented
- [ ] Performance acceptable
- [ ] Accessibility standards met
- [ ] User experience smooth on all devices
- [ ] Ready for production

## Notes

Use this section to document:
- Issues found and their status
- Devices tested
- Browser versions tested
- Date of testing
- Tester name
- Any deviations from expected behavior
